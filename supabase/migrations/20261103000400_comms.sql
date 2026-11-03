-- 4. Announcements, inquiries, notifications, preferences, push subscriptions, rate limits.

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  body text not null check (char_length(body) between 1 and 4000),
  -- Optional: the scholarship this is about.
  scholarship_id uuid references public.scholarships (id) on delete set null,
  author_id uuid references public.profiles (id) on delete set null,
  -- Who students see as the sender, e.g. "City Scholarship Office".
  posted_as text not null default 'Scholarship office' check (char_length(posted_as) between 2 and 120),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

create function public.announcements_set_author() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := coalesce(auth.uid(), new.author_id);
  elsif new.author_id is distinct from old.author_id then
    raise exception 'author_id cannot change' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger announcements_author before insert or update on public.announcements
  for each row execute function public.announcements_set_author();

create type public.inquiry_status as enum ('open', 'answered', 'closed');

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles (id) on delete set null,
  scholarship_id uuid references public.scholarships (id) on delete set null,
  question text not null check (char_length(question) between 5 and 2000),
  -- Snapshot staff see instead of the student's identity, e.g. "BSEd, 2nd year".
  student_context text check (student_context is null or char_length(student_context) <= 160),
  status public.inquiry_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger inquiries_updated_at before update on public.inquiries
  for each row execute function public.set_updated_at();

create function public.inquiries_set_student() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.student_id := auth.uid();
    new.status := 'open';
  elsif new.student_id is distinct from old.student_id or new.question is distinct from old.question then
    raise exception 'A question cannot be edited after it is sent' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger inquiries_student before insert or update on public.inquiries
  for each row execute function public.inquiries_set_student();

create table public.inquiry_replies (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger inquiry_replies_updated_at before update on public.inquiry_replies
  for each row execute function public.set_updated_at();

create function public.inquiry_replies_bookkeeping() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := coalesce(auth.uid(), new.author_id);
    update public.inquiries set status = 'answered' where id = new.inquiry_id and status = 'open';
  elsif new.author_id is distinct from old.author_id or new.inquiry_id is distinct from old.inquiry_id then
    raise exception 'A reply cannot move' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger inquiry_replies_bookkeeping before insert or update on public.inquiry_replies
  for each row execute function public.inquiry_replies_bookkeeping();

-- ---------- Notifications ----------

create type public.notification_kind as enum ('deadline', 'change', 'new', 'announce');
create type public.delivery_status as enum ('skipped', 'pending', 'sent', 'failed');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 1000),
  -- In-app path only, so a notification can never link off-site.
  link text check (link is null or (link ~ '^/' and link !~ '^//')),
  -- Idempotency: e.g. deadline:{scholarship}:{days_left}. Re-running a job can't duplicate it.
  dedupe_key text not null check (char_length(dedupe_key) <= 200),
  read_at timestamptz,
  email_status public.delivery_status not null default 'skipped',
  email_attempts smallint not null default 0,
  email_error text,
  emailed_at timestamptz,
  push_status public.delivery_status not null default 'skipped',
  push_error text,
  created_at timestamptz not null default now(),
  constraint one_notification_per_event unique (user_id, dedupe_key)
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email boolean not null default true,
  push boolean not null default false,
  site boolean not null default true,
  lead_days smallint not null default 7 check (lead_days in (1, 3, 7, 14)),
  new_matches boolean not null default true,
  changes boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- Every new profile gets default preferences.
create function public.profiles_default_preferences() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notification_preferences (user_id) values (new.id) on conflict do nothing;
  return null;
end $$;
create trigger profiles_default_preferences after insert on public.profiles
  for each row execute function public.profiles_default_preferences();

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (user_agent is null or char_length(user_agent) <= 400),
  created_at timestamptz not null default now()
);

create function public.push_subscriptions_set_user() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not public.is_privileged() then
    new.user_id := auth.uid();
  end if;
  return new;
end $$;
create trigger push_subscriptions_user before insert on public.push_subscriptions
  for each row execute function public.push_subscriptions_set_user();

-- ---------- Rate limits (auth and inquiry endpoints) ----------

create table public.rate_limits (
  key text not null check (char_length(key) <= 300),
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

-- Fixed-window counter. Returns true when the call is allowed.
-- Execute is granted to service_role only (migration 6): anyone else could burn another
-- person's budget by guessing their key.
-- ponytail: fixed window lets a burst of 2× max straddle a boundary; use a sliding log if that matters.
create function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into n;
  -- Opportunistic cleanup of old windows for this key.
  delete from public.rate_limits where key = p_key and window_start < w;
  return n <= p_max;
end $$;
