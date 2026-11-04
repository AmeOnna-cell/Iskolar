-- Phase 7: performance, from EXPLAIN ANALYZE on 5,000 listings / 2,000 students / 50,000 alerts /
-- 100,000 audit entries (scripts/synth.sql, scripts/explain.sql, docs/performance.md).
--
-- 1. Let the planner inline the date/status helpers (they ran as a function call per row).
-- 2. Eligibility for search, dashboard counts and new-match alerts from one inlinable tally;
--    the full explainable items (jsonb) are built only for the rows on the page.
-- 3. Alert fan-out (announcements, new matches, changes) as one set-based insert per event.

-- ---------- 1. Inlinable helpers ----------
--
-- `set search_path` stops Postgres from inlining a SQL function, so these ran once per row.
-- Without it they're inlined into the calling query. That is safe here: they are security
-- invoker, use only built-in operators and schema-qualified names, and when inlined into a
-- security definer function (search_path = '') they are planned under that empty path.
-- (The Supabase linter will list them under "function_search_path_mutable"; this is deliberate.)
alter function public.today_ph() reset search_path;
alter function public.scholarship_status(date, date) reset search_path;

-- ---------- 2. Eligibility tally ----------

-- One code per requirement the listing has, in eligibility_items order: 0 met, 1 unknown,
-- 2 not met. Same rules as public.eligibility_items (pgTAP 90_performance checks they agree).
-- Inlinable for the same reason as above (immutable, plain expressions, no search_path).
create function public.eligibility_codes(sp public.student_profiles, c public.scholarship_criteria)
returns smallint[] language sql immutable as $$
  select array_remove(array[
    case when c.fields is null then null when sp.field is null then 1 when sp.field = any (c.fields) then 0 else 2 end,
    case when c.year_levels is null then null when sp.year_level is null then 1 when sp.year_level = any (c.year_levels) then 0 else 2 end,
    case when c.gwa_max is null then null when sp.gwa is null then 1 when sp.gwa <= c.gwa_max then 0 else 2 end,
    case when c.income_max is null then null
         when sp.income_bracket is null then 1
         when (case sp.income_bracket when 'below_150k' then 150000 when '150k_250k' then 250000
                 when '250k_400k' then 400000 when '400k_800k' then 800000 end) <= c.income_max then 0
         when (case sp.income_bracket when 'below_150k' then 0 when '150k_250k' then 150000
                 when '250k_400k' then 250001 when '400k_800k' then 400001 else 800001 end) > c.income_max then 2
         else 1 end,
    case when not coalesce(c.requires_four_ps, false) then null when sp.four_ps = 'yes' then 0 when sp.four_ps = 'no' then 2 else 1 end,
    case when not coalesce(c.requires_ofw, false) then null when sp.ofw is null then 1 when sp.ofw then 0 else 2 end,
    case when c.regions is null then null when sp.region is null then 1 when sp.region = any (c.regions) then 0 else 2 end
  ]::smallint[], null)
$$;

create function public.verdict_of(codes smallint[], has_profile boolean) returns text
language sql immutable as $$
  select case when not has_profile then 'none' when 2 = any (codes) then 'no' when 1 = any (codes) then 'maybe' else 'yes' end
$$;

-- Explore and dashboard search. Same contract as before; the explainable items (first_gap) are
-- now computed for the page only, and status/days/verdict for each row from cheap expressions.
create or replace function public.search_scholarships(
  p_q text default null,
  p_status text default null,
  p_type public.provider_type default null,
  p_field public.course_field default null,
  p_region public.region default null,
  p_year smallint default null,
  p_eligible_only boolean default false,
  p_sort text default 'deadline',
  p_page integer default 1,
  p_page_size integer default 20
) returns table (
  id uuid, slug text, name text, summary text,
  provider_name text, provider_short_name text, provider_abbr text, provider_color text, provider_type public.provider_type,
  amount_text text, amount_num integer, opens_on date, closes_on date, status text, days_left integer, days_to_open integer,
  location_label text, verification public.verification_status, last_verified_at timestamptz, published_at timestamptz,
  is_sample boolean, verdict text, unknown_count integer, not_met_count integer, first_gap jsonb, total_count bigint
)
language sql stable set search_path = '' as $$
  with me as materialized (
    select sp from public.my_student_profile() sp
  ),
  t as materialized (
    select public.today_ph() as d, public.to_prefix_tsquery(p_q) as tsq,
           exists (select 1 from me) as has_profile, (select me.sp from me) as sp,
           least(greatest(coalesce(p_page_size, 20), 1), 50) as size
  ),
  base as (
    select s.id, s.slug, s.name, s.summary,
           p.name as provider_name, p.short_name as provider_short_name, p.abbr as provider_abbr,
           p.color as provider_color, p.type as provider_type,
           s.amount_text, s.amount_num, s.opens_on, s.closes_on,
           case when s.opens_on is not null and t.d < s.opens_on then 'upcoming'
                when s.closes_on is not null and t.d > s.closes_on then 'closed' else 'open' end as status,
           (s.closes_on - t.d) as days_left, (s.opens_on - t.d) as days_to_open,
           s.location_label, s.verification, s.last_verified_at, s.published_at, s.is_sample,
           public.verdict_of(public.eligibility_codes(t.sp, c), t.has_profile) as verdict,
           public.eligibility_codes(t.sp, c) as codes
      from public.scholarships s
      join public.providers p on p.id = s.provider_id
      left join public.scholarship_criteria c on c.scholarship_id = s.id
      cross join t
     where s.listing_status = 'published'
       and (t.tsq is null or s.search_doc @@ t.tsq)
       and (p_type is null or p.type = p_type)
       -- A filter keeps listings with no such restriction (open to every course, region, year).
       and (p_field is null or c.fields is null or p_field = any (c.fields))
       and (p_region is null or c.regions is null or p_region = any (c.regions))
       and (p_year is null or c.year_levels is null or p_year = any (c.year_levels))
  ),
  keyed as (
    select b.*,
           case when p_sort = 'match' then case b.verdict when 'yes' then 0 when 'maybe' then 1 when 'none' then 2 else 3 end end as k1,
           case when p_sort = 'amount' then b.amount_num end as k2,
           case when p_sort = 'newest' then b.published_at end as k3,
           -- Closing soonest (prototype rank): open by days left, then upcoming by opening date, then closed newest first.
           case b.status when 'open' then 0 when 'upcoming' then 1 else 2 end as k4,
           case b.status when 'open' then b.days_left when 'upcoming' then b.days_to_open else -b.days_left end as k5
      from base b
     where (p_status is null or b.status = p_status)
       and (not p_eligible_only or b.verdict in ('yes', 'maybe'))
  ),
  page as (
    select k.*, count(*) over () as total_count
      from keyed k
     order by k.k1, k.k2 desc nulls last, k.k3 desc nulls last, k.k4, k.k5, k.name, k.id
     limit (select size from t)
    offset (greatest(coalesce(p_page, 1), 1) - 1) * (select size from t)
  )
  select pg.id, pg.slug, pg.name, pg.summary, pg.provider_name, pg.provider_short_name, pg.provider_abbr, pg.provider_color,
         pg.provider_type, pg.amount_text, pg.amount_num, pg.opens_on, pg.closes_on, pg.status, pg.days_left, pg.days_to_open,
         pg.location_label, pg.verification, pg.last_verified_at, pg.published_at, pg.is_sample, pg.verdict,
         coalesce(cardinality(array_positions(pg.codes, 1::smallint)), 0) as unknown_count,
         coalesce(cardinality(array_positions(pg.codes, 2::smallint)), 0) as not_met_count,
         e.first_gap, pg.total_count
    from page pg
    cross join t
    left join public.scholarship_criteria c on c.scholarship_id = pg.id
    -- The explainable items, only for the rows on this page.
    cross join lateral public.eligibility_summary(public.eligibility_items(t.sp, c), t.has_profile) e
   order by pg.k1, pg.k2 desc nulls last, pg.k3 desc nulls last, pg.k4, pg.k5, pg.name, pg.id
$$;

-- Dashboard: how many open or upcoming listings the student qualifies for / might qualify for.
create or replace function public.eligibility_counts(p_student uuid)
returns table (yes integer, maybe integer, no integer)
language plpgsql stable set search_path = '' as $$
declare
  sp public.student_profiles;
  has_profile boolean;
  today date := public.today_ph();
begin
  if p_student is distinct from auth.uid() and not public.is_privileged() then
    raise exception 'You can only check your own eligibility' using errcode = '42501';
  end if;
  select * into sp from public.student_profiles where user_id = p_student;
  has_profile := found;
  return query
    select count(*) filter (where v = 'yes')::int, count(*) filter (where v = 'maybe')::int, count(*) filter (where v = 'no')::int
      from (
        select public.verdict_of(public.eligibility_codes(sp, c), has_profile) as v
          from public.scholarships s
          left join public.scholarship_criteria c on c.scholarship_id = s.id
         where s.listing_status = 'published' and (s.closes_on is null or s.closes_on >= today)
      ) x;
end $$;

-- ---------- 3. Set-based alert fan-out ----------

-- notify() for many students at once: one insert, preferences applied in the same statement.
create function public.notify_many(
  p_users uuid[], p_kind public.notification_kind, p_title text, p_body text, p_link text,
  p_dedupe text, p_payload jsonb default '{}'::jsonb
) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if p_users is null or cardinality(p_users) = 0 then return 0; end if;
  insert into public.notifications (user_id, kind, title, body, link, dedupe_key, payload, read_at, email_status, push_status)
  select np.user_id, p_kind, left(p_title, 200), left(coalesce(p_body, ''), 1000), p_link, left(p_dedupe, 200), p_payload,
         case when np.site then null else now() end,
         (case when np.email then 'pending' else 'skipped' end)::public.delivery_status,
         (case when np.push and exists (select 1 from public.push_subscriptions s where s.user_id = np.user_id)
               then 'pending' else 'skipped' end)::public.delivery_status
    -- unnest + join (not "= any"): index lookups whether it's 1 student or 20,000, and the
    -- cached generic plan in plpgsql callers stays good for both.
    from (select distinct u from unnest(p_users) u) ids
    join public.notification_preferences np on np.user_id = ids.u
    join public.profiles p on p.id = np.user_id and p.status = 'active' and p.role = 'student'
   where not (p_kind = 'new' and not np.new_matches)
     and not (p_kind = 'change' and not np.changes)
  on conflict (user_id, dedupe_key) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.notify(
  p_user uuid, p_kind public.notification_kind, p_title text, p_body text, p_link text,
  p_dedupe text, p_payload jsonb default '{}'::jsonb
) returns boolean
-- plpgsql (not sql) so the daily reminder loop reuses one cached plan instead of re-planning per call.
language plpgsql security definer set search_path = '' as $$
begin
  return public.notify_many(array[p_user], p_kind, p_title, p_body, p_link, p_dedupe, p_payload) > 0;
end $$;

create or replace function public.notify_deadline_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  if new.old_closes_on is null or new.new_closes_on is null or new.old_closes_on = new.new_closes_on then
    return null;
  end if;
  select sc.slug, sc.name, coalesce(pv.short_name, pv.name) as provider into s
    from public.scholarships sc join public.providers pv on pv.id = sc.provider_id
   where sc.id = new.scholarship_id;
  perform public.notify_many(
    array(select public.trackers(new.scholarship_id)), 'change', s.name || ': deadline moved',
    'New deadline is ' || to_char(new.new_closes_on, 'FMMon FMDD, YYYY') || ' (was ' || to_char(new.old_closes_on, 'FMMon FMDD, YYYY') || ').',
    '/s/' || s.slug,
    'change:' || new.scholarship_id || ':deadline:' || new.new_closes_on,
    jsonb_build_object('change', 'deadline', 'scholarship_name', s.name, 'provider_name', s.provider,
                       'previous_closes_on', new.old_closes_on, 'new_closes_on', new.new_closes_on, 'path', '/s/' || s.slug)
  );
  update public.deadline_changes set notified_at = now() where id = new.id;
  return null;
end $$;

create or replace function public.notify_requirements_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := case when tg_op = 'DELETE' then old.scholarship_id else new.scholarship_id end;
  users uuid[] := array(select public.trackers(sid));
  s record;
begin
  if cardinality(users) = 0 then return null; end if;
  select sc.slug, sc.name, coalesce(pv.short_name, pv.name) as provider into s
    from public.scholarships sc join public.providers pv on pv.id = sc.provider_id
   where sc.id = sid;
  perform public.notify_many(
    users, 'change', s.name || ': requirements updated',
    'Check the requirements and your document checklist again.',
    '/s/' || s.slug,
    'change:' || sid || ':requirements:' || public.manila_today(),
    jsonb_build_object('change', 'requirements', 'scholarship_name', s.name, 'provider_name', s.provider, 'path', '/s/' || s.slug)
  );
  return null;
end $$;

create or replace function public.notify_new_match() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c public.scholarship_criteria;
  pv text;
  yes_users uuid[];
  maybe_users uuid[];
  payload jsonb;
begin
  if new.closes_on is not null and new.closes_on < public.manila_today() then return null; end if;
  select * into c from public.scholarship_criteria where scholarship_id = new.id;
  select coalesce(p.short_name, p.name) into pv from public.providers p where p.id = new.provider_id;
  select array_agg(x.user_id) filter (where x.v = 'yes'), array_agg(x.user_id) filter (where x.v = 'maybe')
    into yes_users, maybe_users
    from (
      select st.user_id, public.verdict_of(public.eligibility_codes(st, c), true) as v
        from public.student_profiles st
        join public.profiles p on p.id = st.user_id and p.status = 'active' and p.role = 'student'
    ) x;
  payload := jsonb_build_object('scholarship_name', new.name, 'provider_name', pv, 'amount', new.amount_text,
                                'closes_on', new.closes_on, 'path', '/s/' || new.slug);
  perform public.notify_many(yes_users, 'new', 'New scholarship: ' || new.name, 'Matches your profile.',
                             '/s/' || new.slug, 'new:' || new.id, payload || '{"verdict": "yes"}');
  perform public.notify_many(maybe_users, 'new', 'New scholarship: ' || new.name, new.amount_text || '. Check if you qualify.',
                             '/s/' || new.slug, 'new:' || new.id, payload || '{"verdict": "maybe"}');
  return null;
end $$;

create or replace function public.notify_announcement() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify_many(
    array(select p.id from public.profiles p where p.role = 'student' and p.status = 'active'),
    'announce', new.title, left(new.body, 300), '/dashboard', 'announce:' || new.id,
    jsonb_build_object('title', new.title, 'body', new.body, 'from', new.posted_as)
  );
  return null;
end $$;

-- ---------- Privileges ----------

revoke execute on function public.notify_many(uuid[], public.notification_kind, text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.notify(uuid, public.notification_kind, text, text, text, text, jsonb) from public, anon, authenticated;
-- Pure functions of their arguments (no table access), safe for anyone.
grant execute on function public.eligibility_codes(public.student_profiles, public.scholarship_criteria) to anon, authenticated, service_role;
grant execute on function public.verdict_of(smallint[], boolean) to anon, authenticated, service_role;
