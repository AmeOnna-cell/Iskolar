-- 1. Enums, profiles, student eligibility answers, role helpers.
--
-- Design notes
-- * profiles.id mirrors auth.users.id but has NO foreign key to auth.users. Deleting a user
--   anonymises the profile and then hard-deletes the auth user (docs/data-retention.md); the
--   profile row stays as a tombstone so scholarships, replies and audit rows keep their references.
-- * RLS reads the role from profiles (authoritative), not from the JWT claim. A JWT can be up to
--   one hour stale after a demotion or deactivation; the lookup is one primary-key read per
--   statement, cached by wrapping helpers in (select ...). The JWT claim (custom access token hook,
--   migration 9) is for middleware routing only.

create extension if not exists pg_trgm with schema extensions;

create type public.app_role as enum ('student', 'coordinator', 'admin');
create type public.account_status as enum ('active', 'deactivated', 'deleted');

-- Course areas and regions from the prototype. Labels live in src/lib/reference.ts.
create type public.course_field as enum (
  'science_math', 'engineering', 'it_cs', 'agriculture_fisheries',
  'health_sciences', 'education', 'business_accountancy', 'arts_humanities_social'
);
create type public.region as enum (
  'ncr', 'car', 'ilocos', 'cagayan_valley', 'central_luzon', 'calabarzon', 'mimaropa', 'bicol',
  'western_visayas', 'central_visayas', 'eastern_visayas', 'zamboanga_peninsula',
  'northern_mindanao', 'davao', 'soccsksargen', 'caraga', 'barmm'
);
-- Yearly household income brackets (prototype INCOME). Upper bounds via income_bracket_max().
create type public.income_bracket as enum ('below_150k', '150k_250k', '250k_400k', '400k_800k', 'above_800k');
-- "Not sure" is an answer, distinct from "not answered yet" (NULL). The checker shows different text.
create type public.tri_answer as enum ('yes', 'no', 'unsure');

-- ---------- Shared triggers ----------

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Today in the Philippines. Deadlines are calendar dates in Asia/Manila.
create function public.today_ph() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Asia/Manila')::date
$$;

-- ---------- Profiles ----------

create table public.profiles (
  id uuid primary key,
  email text check (email is null or char_length(email) <= 320),
  full_name text check (full_name is null or char_length(full_name) between 1 and 120),
  role public.app_role not null default 'student',
  status public.account_status not null default 'active',
  deactivated_at timestamptz,
  deactivated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deactivation_consistent check ((status = 'active') = (deactivated_at is null))
);
comment on table public.profiles is 'One row per account. Tombstoned (anonymised, status=deleted) instead of deleted.';

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- New auth user → profile. Role is ALWAYS student here; it never comes from sign-up metadata.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120), '')
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in step with confirmed email changes.
create function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id and email is distinct from new.email;
  return new;
end $$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------- Role helpers (used by RLS) ----------

-- The caller's role if their account is active; NULL for anon, deactivated or deleted accounts.
create function public.my_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.status = 'active'
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() in ('coordinator', 'admin'), false)
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

create function public.is_student() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() = 'student', false)
$$;

-- True for trusted server contexts: migrations/seed/psql (no SET ROLE) and the service-role key.
-- Reads the `role` setting (what PostgREST SET ROLEs to), which security definer does not change.
create function public.is_privileged() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(nullif(current_setting('role', true), ''), 'none') in ('none', 'service_role', 'postgres')
$$;

-- Role, status and deactivation fields change only through admin functions (security definer,
-- which check is_admin()) or trusted server code. A student can never change their own role.
create function public.guard_profile_privileged_columns() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.deactivated_at is distinct from old.deactivated_at
      or new.deactivated_by is distinct from old.deactivated_by
      or new.id is distinct from old.id)
     and current_user in ('authenticated', 'anon') then
    raise exception 'Only an admin can change roles or account status'
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_guard_privileged before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- ---------- Student eligibility answers ----------

create table public.student_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  field public.course_field,
  program text check (program is null or char_length(program) <= 120),
  year_level smallint check (year_level between 1 and 6),
  gwa numeric(3, 2) check (gwa between 1.00 and 5.00),
  gwa_unknown boolean not null default false,
  income_bracket public.income_bracket,
  four_ps public.tri_answer,
  ofw boolean,
  region public.region,
  -- The family step was answered (so NULL income means "I'm not sure", not "skipped").
  answered_family boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gwa_or_unknown check (not (gwa_unknown and gwa is not null))
);
comment on column public.student_profiles.four_ps is 'NULL = not answered; unsure = answered "Not sure".';

create trigger student_profiles_updated_at before update on public.student_profiles
  for each row execute function public.set_updated_at();

-- Upper bound (pesos/year) of an income bracket; NULL for above_800k (no upper bound).
create function public.income_bracket_max(b public.income_bracket) returns integer
language sql immutable set search_path = '' as $$
  select case b
    when 'below_150k' then 150000
    when '150k_250k' then 250000
    when '250k_400k' then 400000
    when '400k_800k' then 800000
    else null
  end
$$;
