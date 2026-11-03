-- 2. Providers, scholarships and their parts (criteria, benefits, documents, steps, notes),
--    deadline change history, search document.

create type public.provider_type as enum ('government', 'local_government', 'private', 'school');
create type public.listing_status as enum ('draft', 'in_review', 'published', 'archived');
create type public.verification_status as enum ('unverified', 'verified');

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 160),
  -- Short display name without the parenthetical, e.g. "Commission on Higher Education".
  short_name text check (short_name is null or char_length(short_name) between 2 and 120),
  abbr text not null check (char_length(abbr) between 1 and 5),
  color text not null default '#334155' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  type public.provider_type not null,
  website text check (website is null or website ~ '^https?://'),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger providers_updated_at before update on public.providers
  for each row execute function public.set_updated_at();

create table public.scholarships (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  provider_id uuid not null references public.providers (id) on delete restrict,
  name text not null check (char_length(name) between 3 and 160),
  summary text not null default '' check (char_length(summary) <= 600),
  amount_text text not null check (char_length(amount_text) between 1 and 120),
  -- Approximate pesos per year, for "highest amount" sorting only.
  amount_num integer check (amount_num >= 0),
  opens_on date,
  closes_on date,
  location_label text check (location_label is null or char_length(location_label) <= 120),
  source_label text not null check (char_length(source_label) between 2 and 160),
  source_url text check (source_url is null or source_url ~ '^https?://'),
  duration text check (duration is null or char_length(duration) <= 300),
  renewal text check (renewal is null or char_length(renewal) <= 600),
  obligations text check (obligations is null or char_length(obligations) <= 600),
  listing_status public.listing_status not null default 'draft',
  verification public.verification_status not null default 'unverified',
  last_verified_at timestamptz,
  last_verified_by uuid references public.profiles (id) on delete set null,
  assigned_coordinator_id uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  is_sample boolean not null default false,
  search_doc tsvector not null default ''::tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dates_in_order check (opens_on is null or closes_on is null or closes_on >= opens_on),
  constraint verified_has_date check ((verification = 'verified') = (last_verified_at is not null))
);
comment on column public.scholarships.is_sample is 'Seeded test data. Shown with a "Sample listing" label; never presented as official.';

create trigger scholarships_updated_at before update on public.scholarships
  for each row execute function public.set_updated_at();

-- Eligibility criteria the checker can test. One row per scholarship; NULL / false = no such criterion.
create table public.scholarship_criteria (
  scholarship_id uuid primary key references public.scholarships (id) on delete cascade,
  income_max integer check (income_max > 0),
  gwa_max numeric(3, 2) check (gwa_max between 1.00 and 5.00),
  year_levels smallint[] check (year_levels is null or (cardinality(year_levels) > 0 and year_levels <@ array[1,2,3,4,5,6]::smallint[])),
  fields public.course_field[] check (fields is null or cardinality(fields) > 0),
  regions public.region[] check (regions is null or cardinality(regions) > 0),
  requires_ofw boolean not null default false,
  requires_four_ps boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger scholarship_criteria_updated_at before update on public.scholarship_criteria
  for each row execute function public.set_updated_at();

create table public.scholarship_benefits (
  id uuid primary key default gen_random_uuid(),
  scholarship_id uuid not null references public.scholarships (id) on delete cascade,
  position smallint not null check (position >= 0),
  text text not null check (char_length(text) between 1 and 300),
  unique (scholarship_id, position) deferrable initially deferred
);

create table public.scholarship_documents (
  id uuid primary key default gen_random_uuid(),
  scholarship_id uuid not null references public.scholarships (id) on delete cascade,
  position smallint not null check (position >= 0),
  name text not null check (char_length(name) between 1 and 200),
  where_to_get text not null default '' check (char_length(where_to_get) <= 300),
  unique (scholarship_id, position) deferrable initially deferred
);

create table public.scholarship_steps (
  id uuid primary key default gen_random_uuid(),
  scholarship_id uuid not null references public.scholarships (id) on delete cascade,
  position smallint not null check (position >= 0),
  title text not null check (char_length(title) between 1 and 200),
  detail text not null default '' check (char_length(detail) <= 600),
  unique (scholarship_id, position) deferrable initially deferred
);

-- Requirements the checker cannot test ("Also required (confirm these yourself)").
create table public.scholarship_notes (
  id uuid primary key default gen_random_uuid(),
  scholarship_id uuid not null references public.scholarships (id) on delete cascade,
  position smallint not null check (position >= 0),
  text text not null check (char_length(text) between 1 and 300),
  unique (scholarship_id, position) deferrable initially deferred
);

-- Drives "deadline moved" alerts (Phase 6) and the staff history view.
create table public.deadline_changes (
  id uuid primary key default gen_random_uuid(),
  scholarship_id uuid not null references public.scholarships (id) on delete cascade,
  old_opens_on date,
  new_opens_on date,
  old_closes_on date,
  new_closes_on date,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now(),
  notified_at timestamptz
);

-- ---------- Search document (name + provider + summary), prefix search ----------

create function public.scholarship_search_doc(p_name text, p_summary text, p_provider_id uuid)
returns tsvector language sql stable set search_path = '' as $$
  select setweight(to_tsvector('simple', coalesce(p_name, '')), 'A')
      || setweight(to_tsvector('simple', coalesce(p.name, '') || ' ' || coalesce(p.abbr, '')), 'B')
      || setweight(to_tsvector('simple', coalesce(p_summary, '')), 'C')
  from (select 1) one
  left join public.providers p on p.id = p_provider_id
$$;

create function public.scholarships_set_search_doc() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.search_doc := public.scholarship_search_doc(new.name, new.summary, new.provider_id);
  return new;
end $$;

create trigger scholarships_search_doc before insert or update of name, summary, provider_id on public.scholarships
  for each row execute function public.scholarships_set_search_doc();

create function public.providers_refresh_search_doc() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.scholarships s
     set search_doc = public.scholarship_search_doc(s.name, s.summary, s.provider_id)
   where s.provider_id = new.id;
  return null;
end $$;

create trigger providers_search_doc after update of name, abbr on public.providers
  for each row execute function public.providers_refresh_search_doc();

-- "dost ched" → 'dost:* & ched:*'. Keeps letters and digits only, so user input can't break the query.
create function public.to_prefix_tsquery(q text) returns tsquery
language sql immutable set search_path = '' as $$
  select case when count(*) = 0 then null
              else to_tsquery('simple', string_agg(t || ':*', ' & ')) end
  from unnest(regexp_split_to_array(lower(coalesce(q, '')), '[^[:alnum:]]+')) t
  where t <> ''
$$;

-- ---------- Workflow guard: what coordinators may and may not change ----------
--
-- Coordinators create drafts (auto-assigned to themselves), edit listings assigned to them
-- (including deadlines and requirements on published listings), and submit for verification.
-- Only admins verify, publish, unpublish, archive and assign coordinators.

create function public.guard_scholarship_workflow() returns trigger
language plpgsql set search_path = '' as $$
declare
  admin boolean := public.is_admin() or public.is_privileged();
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    if not admin then
      if new.listing_status not in ('draft', 'in_review') then
        raise exception 'Only an admin can publish or archive a listing' using errcode = '42501';
      end if;
      if new.verification <> 'unverified' then
        raise exception 'Only an admin can verify a listing' using errcode = '42501';
      end if;
      new.assigned_coordinator_id := auth.uid();
      new.created_by := auth.uid();
      new.published_at := null;
    end if;
  else
    if new.created_by is distinct from old.created_by then
      raise exception 'created_by cannot change' using errcode = '42501';
    end if;
    if not admin then
      if new.listing_status is distinct from old.listing_status
         and (old.listing_status not in ('draft', 'in_review') or new.listing_status not in ('draft', 'in_review')) then
        raise exception 'Only an admin can publish, unpublish or archive a listing' using errcode = '42501';
      end if;
      if new.verification is distinct from old.verification
         or new.last_verified_at is distinct from old.last_verified_at
         or new.last_verified_by is distinct from old.last_verified_by then
        raise exception 'Only an admin can verify a listing' using errcode = '42501';
      end if;
      if new.assigned_coordinator_id is distinct from old.assigned_coordinator_id then
        raise exception 'Only an admin can assign coordinators' using errcode = '42501';
      end if;
      if new.published_at is distinct from old.published_at then
        raise exception 'published_at is set by publishing' using errcode = '42501';
      end if;
    end if;
  end if;

  -- Bookkeeping for everyone.
  if new.listing_status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if new.verification = 'verified' and (tg_op = 'INSERT' or old.verification <> 'verified') then
    new.last_verified_at := coalesce(new.last_verified_at, now());
    new.last_verified_by := coalesce(new.last_verified_by, auth.uid());
  elsif new.verification = 'unverified' then
    new.last_verified_at := null;
    new.last_verified_by := null;
  end if;
  return new;
end $$;

create trigger scholarships_guard_workflow before insert or update on public.scholarships
  for each row execute function public.guard_scholarship_workflow();

-- Record every deadline change (security definer: students and coordinators cannot write the table).
create function public.record_deadline_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.deadline_changes (scholarship_id, old_opens_on, new_opens_on, old_closes_on, new_closes_on, changed_by)
  values (new.id, old.opens_on, new.opens_on, old.closes_on, new.closes_on, auth.uid());
  return null;
end $$;

create trigger scholarships_deadline_change after update of opens_on, closes_on on public.scholarships
  for each row
  when (old.opens_on is distinct from new.opens_on or old.closes_on is distinct from new.closes_on)
  execute function public.record_deadline_change();

-- Open / upcoming / closed, computed in Philippine time (never stored, so it can't go stale).
create function public.scholarship_status(p_opens date, p_closes date) returns text
language sql stable set search_path = '' as $$
  select case
    when p_opens is not null and public.today_ph() < p_opens then 'upcoming'
    when p_closes is not null and public.today_ph() > p_closes then 'closed'
    else 'open'
  end
$$;
