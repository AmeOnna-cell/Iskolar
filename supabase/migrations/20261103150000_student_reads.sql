-- Phase 4 read helpers for the student screens. Both aggregate in SQL so the landing page and the
-- dashboard never pull every listing to count them.

-- Landing page: published listings by status, verification and provider type (visitors too).
create function public.listing_stats() returns jsonb
language sql stable set search_path = '' as $$
  with x as (
    select s.verification, p.type, public.scholarship_status(s.opens_on, s.closes_on) as st
      from public.scholarships s
      join public.providers p on p.id = s.provider_id
     where s.listing_status = 'published'
  )
  select jsonb_build_object(
    'total', (select count(*) from x),
    'open', (select count(*) from x where st = 'open'),
    'upcoming', (select count(*) from x where st = 'upcoming'),
    'verified', (select count(*) from x where verification = 'verified'),
    'by_type', coalesce((select jsonb_object_agg(type, n) from (
        select type, count(*) as n from x where st <> 'closed' group by type) t), '{}'::jsonb)
  )
$$;
grant execute on function public.listing_stats() to anon, authenticated;

-- Dashboard: how many open or upcoming listings the student qualifies for / might qualify for.
create function public.eligibility_counts(p_student uuid)
returns table (yes integer, maybe integer, no integer)
language plpgsql stable set search_path = '' as $$
begin
  if p_student is distinct from auth.uid() and not public.is_privileged() then
    raise exception 'You can only check your own eligibility' using errcode = '42501';
  end if;
  return query
    select count(*) filter (where e.verdict = 'yes')::int,
           count(*) filter (where e.verdict = 'maybe')::int,
           count(*) filter (where e.verdict = 'no')::int
      from public.eligibility_for_scholarships(p_student) e
      join public.scholarships s on s.id = e.scholarship_id
     where public.scholarship_status(s.opens_on, s.closes_on) <> 'closed';
end $$;
revoke execute on function public.eligibility_counts(uuid) from public, anon;
grant execute on function public.eligibility_counts(uuid) to authenticated, service_role;
