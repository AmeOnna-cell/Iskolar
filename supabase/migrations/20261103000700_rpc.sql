-- 7. RPCs: explainable eligibility, server-side search, batch operations, admin user management.

-- ---------- Eligibility (preliminary check, not an official decision) ----------

create function public.income_bracket_min(b public.income_bracket) returns integer
language sql immutable set search_path = '' as $$
  select case b
    when 'below_150k' then 0
    when '150k_250k' then 150000
    when '250k_400k' then 250001
    when '400k_800k' then 400001
    else 800001
  end
$$;

-- One item per criterion the scholarship has: {kind, status met|not_met|unknown, required, have}.
-- Copy for each item is built in TypeScript (src/lib/eligibility.ts) to keep the prototype's wording.
create function public.eligibility_items(sp public.student_profiles, c public.scholarship_criteria)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb)
  from (
    select 1 as ord, jsonb_build_object('kind', 'field', 'required', to_jsonb(c.fields), 'have', to_jsonb(sp.field),
      'status', case when sp.field is null then 'unknown' when sp.field = any (c.fields) then 'met' else 'not_met' end) as item
    where c.fields is not null
    union all
    select 2, jsonb_build_object('kind', 'year', 'required', to_jsonb(c.year_levels), 'have', to_jsonb(sp.year_level),
      'status', case when sp.year_level is null then 'unknown' when sp.year_level = any (c.year_levels) then 'met' else 'not_met' end)
    where c.year_levels is not null
    union all
    select 3, jsonb_build_object('kind', 'gwa', 'required', to_jsonb(c.gwa_max), 'have', to_jsonb(sp.gwa),
      'status', case when sp.gwa is null then 'unknown' when sp.gwa <= c.gwa_max then 'met' else 'not_met' end)
    where c.gwa_max is not null
    union all
    -- A bracket entirely under the limit is met, entirely over is not met, straddling it is unknown.
    select 4, jsonb_build_object('kind', 'income', 'required', to_jsonb(c.income_max), 'have', to_jsonb(sp.income_bracket),
      'answered', coalesce(sp.answered_family, false),
      'status', case
        when sp.income_bracket is null then 'unknown'
        when public.income_bracket_max(sp.income_bracket) <= c.income_max then 'met'
        when public.income_bracket_min(sp.income_bracket) > c.income_max then 'not_met'
        else 'unknown' end)
    where c.income_max is not null
    union all
    select 5, jsonb_build_object('kind', 'four_ps', 'required', true, 'have', to_jsonb(sp.four_ps),
      'status', case sp.four_ps when 'yes' then 'met' when 'no' then 'not_met' else 'unknown' end)
    where c.requires_four_ps
    union all
    select 6, jsonb_build_object('kind', 'ofw', 'required', true, 'have', to_jsonb(sp.ofw),
      'status', case when sp.ofw is null then 'unknown' when sp.ofw then 'met' else 'not_met' end)
    where c.requires_ofw
    union all
    select 7, jsonb_build_object('kind', 'region', 'required', to_jsonb(c.regions), 'have', to_jsonb(sp.region),
      'status', case when sp.region is null then 'unknown' when sp.region = any (c.regions) then 'met' else 'not_met' end)
    where c.regions is not null
  ) x
$$;

-- yes = every checkable requirement met; maybe = none failed but some unknown; no = one failed;
-- none = the student hasn't answered the eligibility questions at all.
create function public.eligibility_summary(
  items jsonb, has_profile boolean,
  out verdict text, out met integer, out unknown integer, out not_met integer, out total integer, out first_gap jsonb
) language sql immutable set search_path = '' as $$
  select
    case when not has_profile then 'none' when x.nm > 0 then 'no' when x.un > 0 then 'maybe' else 'yes' end,
    x.m, x.un, x.nm, x.t,
    coalesce(
      (select e from jsonb_array_elements(items) e where e ->> 'status' = 'not_met' limit 1),
      (select e from jsonb_array_elements(items) e where e ->> 'status' = 'unknown' limit 1)
    )
  from (
    select count(*) filter (where e ->> 'status' = 'met')::int as m,
           count(*) filter (where e ->> 'status' = 'unknown')::int as un,
           count(*) filter (where e ->> 'status' = 'not_met')::int as nm,
           count(*)::int as t
    from jsonb_array_elements(items) e
  ) x
$$;

-- One student × one scholarship. Students may only check themselves; the server (service role)
-- may check anyone, e.g. for new-match notifications.
create function public.evaluate_eligibility(p_student uuid, p_scholarship uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  sp public.student_profiles;
  c public.scholarship_criteria;
  has_profile boolean;
  items jsonb;
  s record;
begin
  if p_student is distinct from auth.uid() and not public.is_privileged() then
    raise exception 'You can only check your own eligibility' using errcode = '42501';
  end if;
  if not exists (select 1 from public.scholarships where id = p_scholarship) then
    return null;
  end if;
  select * into sp from public.student_profiles where user_id = p_student;
  has_profile := found;
  select * into c from public.scholarship_criteria where scholarship_id = p_scholarship;
  items := public.eligibility_items(sp, c);
  s := public.eligibility_summary(items, has_profile);
  return jsonb_build_object(
    'scholarship_id', p_scholarship, 'verdict', s.verdict, 'met', s.met, 'unknown', s.unknown,
    'not_met', s.not_met, 'total', s.total, 'items', items
  );
end $$;

-- Every visible scholarship for one student (results page, dashboard recommendations).
create function public.eligibility_for_scholarships(p_student uuid)
returns table (scholarship_id uuid, verdict text, met integer, unknown integer, not_met integer, total integer, first_gap jsonb, items jsonb)
language plpgsql stable set search_path = '' as $$
declare
  sp public.student_profiles;
  has_profile boolean;
begin
  if p_student is distinct from auth.uid() and not public.is_privileged() then
    raise exception 'You can only check your own eligibility' using errcode = '42501';
  end if;
  select * into sp from public.student_profiles where user_id = p_student;
  has_profile := found;
  return query
    select s.id, e.verdict, e.met, e.unknown, e.not_met, e.total, e.first_gap, it.items
      from public.scholarships s
      left join public.scholarship_criteria c on c.scholarship_id = s.id
      cross join lateral (select public.eligibility_items(sp, c) as items) it
      cross join lateral public.eligibility_summary(it.items, has_profile) e
     where s.listing_status = 'published';
end $$;

-- ---------- Search (explore page): filtering, sorting and paging in the database ----------

-- The caller's own eligibility answers (0 or 1 rows). Security definer so the search works for
-- visitors, who have no privileges on student_profiles; it only ever returns the caller's row.
create function public.my_student_profile() returns setof public.student_profiles
language sql stable security definer set search_path = '' as $$
  select sp.* from public.student_profiles sp where sp.user_id = auth.uid() and public.is_active_user()
$$;

create function public.search_scholarships(
  p_q text default null,
  p_status text default null,                      -- open | upcoming | closed
  p_type public.provider_type default null,
  p_field public.course_field default null,
  p_region public.region default null,
  p_year smallint default null,
  p_eligible_only boolean default false,            -- "Only ones I qualify for": yes or maybe
  p_sort text default 'deadline',                   -- deadline | newest | amount | match
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
  with me as (
    select sp from public.my_student_profile() sp
  ),
  q as (select public.to_prefix_tsquery(p_q) as tsq),
  base as (
    select s.id, s.slug, s.name, s.summary,
           p.name as provider_name, p.short_name as provider_short_name, p.abbr as provider_abbr,
           p.color as provider_color, p.type as provider_type,
           s.amount_text, s.amount_num, s.opens_on, s.closes_on,
           public.scholarship_status(s.opens_on, s.closes_on) as status,
           (s.closes_on - public.today_ph()) as days_left,
           (s.opens_on - public.today_ph()) as days_to_open,
           s.location_label, s.verification, s.last_verified_at, s.published_at, s.is_sample,
           e.verdict, e.unknown as unknown_count, e.not_met as not_met_count, e.first_gap
      from public.scholarships s
      join public.providers p on p.id = s.provider_id
      left join public.scholarship_criteria c on c.scholarship_id = s.id
      cross join q
      cross join lateral (select public.eligibility_items((select me.sp from me), c) as items) it
      cross join lateral public.eligibility_summary(it.items, exists (select 1 from me)) e
     where s.listing_status = 'published'
       and (q.tsq is null or s.search_doc @@ q.tsq)
       and (p_type is null or p.type = p_type)
       -- A filter keeps listings with no such restriction (open to every course, region, year).
       and (p_field is null or c.fields is null or p_field = any (c.fields))
       and (p_region is null or c.regions is null or p_region = any (c.regions))
       and (p_year is null or c.year_levels is null or p_year = any (c.year_levels))
  )
  select b.*, count(*) over () as total_count
    from base b
   where (p_status is null or b.status = p_status)
     and (not p_eligible_only or b.verdict in ('yes', 'maybe'))
   order by
     case when p_sort = 'match' then case b.verdict when 'yes' then 0 when 'maybe' then 1 when 'none' then 2 else 3 end end,
     case when p_sort = 'amount' then b.amount_num end desc nulls last,
     case when p_sort = 'newest' then b.published_at end desc nulls last,
     -- Closing soonest (prototype rank): open by days left, then upcoming by opening date, then closed newest first.
     case b.status when 'open' then 0 when 'upcoming' then 1 else 2 end,
     case b.status when 'open' then b.days_left when 'upcoming' then b.days_to_open else -b.days_left end,
     b.name, b.id
   limit least(greatest(coalesce(p_page_size, 20), 1), 50)
  offset (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_page_size, 20), 1), 50)
$$;

-- ---------- Batch listing actions: one transaction, one audit row per item, per-row results ----------
-- Security invoker: RLS and the workflow guard decide what this caller may do to each row.

create function public.batch_scholarships(p_action text, p_ids uuid[])
returns table (id uuid, ok boolean, error text)
language plpgsql set search_path = '' as $$
declare
  v_id uuid;
  n integer;
begin
  if p_action not in ('verify', 'publish', 'unpublish', 'archive', 'submit', 'delete') then
    raise exception 'Unknown action %', p_action using errcode = '22023';
  end if;
  if not public.is_staff() then
    raise exception 'Only staff can change listings' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_ids), 0) = 0 or cardinality(p_ids) > 200 then
    raise exception 'Choose between 1 and 200 listings' using errcode = '22023';
  end if;

  foreach v_id in array (select array_agg(distinct x) from unnest(p_ids) x) loop
    begin
      case p_action
        when 'verify' then
          update public.scholarships s set verification = 'verified', last_verified_at = now(), last_verified_by = auth.uid()
           where s.id = v_id;
        when 'publish' then
          update public.scholarships s set listing_status = 'published' where s.id = v_id and s.listing_status <> 'published';
        when 'unpublish' then
          update public.scholarships s set listing_status = 'draft' where s.id = v_id and s.listing_status = 'published';
        when 'archive' then
          update public.scholarships s set listing_status = 'archived' where s.id = v_id and s.listing_status <> 'archived';
        when 'submit' then
          update public.scholarships s set listing_status = 'in_review' where s.id = v_id and s.listing_status = 'draft';
        when 'delete' then
          delete from public.scholarships s where s.id = v_id;
      end case;
      get diagnostics n = row_count;
      id := v_id;
      ok := n > 0;
      error := case when n > 0 then null else 'Not changed: not found, already in that state, or not allowed for you' end;
      return next;
    exception when others then
      id := v_id;
      ok := false;
      error := sqlerrm;
      return next;
    end;
  end loop;
end $$;

-- ---------- Admin: users ----------

create function public.assert_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can do this' using errcode = '42501';
  end if;
end $$;

create function public.other_active_admin_exists(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where role = 'admin' and status = 'active' and id <> p_user)
$$;

-- Deactivate or reactivate many accounts. The server also bans/unbans them in Supabase Auth
-- and revokes their sessions (src/app/(admin)/...), then logs that with log_audit().
create function public.batch_users_status(p_ids uuid[], p_status public.account_status)
returns table (id uuid, ok boolean, error text)
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  target public.profiles;
begin
  perform public.assert_admin();
  if p_status not in ('active', 'deactivated') then
    raise exception 'Use admin_soft_delete_user to delete accounts' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_ids), 0) = 0 or cardinality(p_ids) > 200 then
    raise exception 'Choose between 1 and 200 accounts' using errcode = '22023';
  end if;

  foreach v_id in array (select array_agg(distinct x) from unnest(p_ids) x) loop
    begin
      select * into target from public.profiles p where p.id = v_id for update;
      if not found then
        raise exception 'Account not found';
      elsif target.status = 'deleted' then
        raise exception 'Deleted accounts can''t be changed';
      elsif target.status = p_status then
        raise exception 'Already %', p_status;
      elsif v_id = auth.uid() then
        raise exception 'You can''t deactivate your own account';
      elsif p_status = 'deactivated' and target.role = 'admin' and not public.other_active_admin_exists(v_id) then
        raise exception 'This is the last active admin';
      end if;
      update public.profiles p
         set status = p_status,
             deactivated_at = case when p_status = 'active' then null else now() end,
             deactivated_by = case when p_status = 'active' then null else auth.uid() end
       where p.id = v_id;
      id := v_id; ok := true; error := null;
      return next;
    exception when others then
      id := v_id; ok := false; error := sqlerrm;
      return next;
    end;
  end loop;
end $$;

create function public.admin_set_role(p_user uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
declare target public.profiles;
begin
  perform public.assert_admin();
  select * into target from public.profiles where id = p_user for update;
  if not found then
    raise exception 'Account not found' using errcode = 'P0002';
  elsif target.status <> 'active' then
    raise exception 'Reactivate the account before changing its role' using errcode = '22023';
  elsif p_user = auth.uid() and p_role <> 'admin' then
    raise exception 'You can''t remove your own admin role' using errcode = '42501';
  elsif target.role = 'admin' and p_role <> 'admin' and not public.other_active_admin_exists(p_user) then
    raise exception 'This is the last active admin' using errcode = '42501';
  end if;
  update public.profiles set role = p_role where id = p_user and role is distinct from p_role;
end $$;

-- Step 1 of deleting an account: remove personal data, keep a tombstone row so listings,
-- replies and audit entries stay intact. Step 2 (server, service role): delete the auth user.
create function public.admin_soft_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare target public.profiles;
begin
  perform public.assert_admin();
  select * into target from public.profiles where id = p_user for update;
  if not found then
    raise exception 'Account not found' using errcode = 'P0002';
  elsif target.status = 'deleted' then
    raise exception 'Already deleted' using errcode = '22023';
  elsif p_user = auth.uid() then
    raise exception 'You can''t delete your own account' using errcode = '42501';
  elsif target.role = 'admin' and not public.other_active_admin_exists(p_user) then
    raise exception 'This is the last active admin' using errcode = '42501';
  end if;

  delete from public.student_profiles where user_id = p_user;
  delete from public.applications where student_id = p_user;
  delete from public.notifications where user_id = p_user;
  delete from public.notification_preferences where user_id = p_user;
  delete from public.push_subscriptions where user_id = p_user;
  update public.inquiries set student_context = 'Deleted account' where student_id = p_user;
  update public.profiles
     set status = 'deleted', full_name = null, email = null,
         deactivated_at = coalesce(deactivated_at, now()), deactivated_by = auth.uid()
   where id = p_user;
end $$;

-- ---------- Notifications ----------

-- Mark the given notifications (or all, when p_ids is null) as read. Returns how many changed.
create function public.mark_notifications_read(p_ids uuid[] default null) returns integer
language plpgsql set search_path = '' as $$
declare n integer;
begin
  update public.notifications
     set read_at = now()
   where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids));
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- Execute privileges ----------

-- Visitors have no answers to check; search_scholarships gives them results with verdict "none".
revoke execute on function public.evaluate_eligibility(uuid, uuid) from public, anon;
revoke execute on function public.eligibility_for_scholarships(uuid) from public, anon;
grant execute on function public.evaluate_eligibility(uuid, uuid) to authenticated, service_role;
grant execute on function public.eligibility_for_scholarships(uuid) to authenticated, service_role;

revoke execute on function public.batch_users_status(uuid[], public.account_status) from public, anon;
revoke execute on function public.admin_set_role(uuid, public.app_role) from public, anon;
revoke execute on function public.admin_soft_delete_user(uuid) from public, anon;
revoke execute on function public.batch_scholarships(text, uuid[]) from public, anon;
revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.batch_users_status(uuid[], public.account_status) to authenticated;
grant execute on function public.admin_set_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_soft_delete_user(uuid) to authenticated;
grant execute on function public.batch_scholarships(text, uuid[]) to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
