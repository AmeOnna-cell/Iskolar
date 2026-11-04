-- Sample (seeded example) listings are never presented as verified with an official source.
-- Landing numbers: "verified" counts real listings only, and samples are counted separately.
create or replace function public.listing_stats() returns jsonb
language sql stable set search_path = '' as $$
  with x as (
    select s.verification, s.is_sample, p.type, public.scholarship_status(s.opens_on, s.closes_on) as st
      from public.scholarships s
      join public.providers p on p.id = s.provider_id
     where s.listing_status = 'published'
  )
  select jsonb_build_object(
    'total', (select count(*) from x),
    'open', (select count(*) from x where st = 'open'),
    'upcoming', (select count(*) from x where st = 'upcoming'),
    'verified', (select count(*) from x where verification = 'verified' and not is_sample),
    'sample', (select count(*) from x where is_sample),
    'by_type', coalesce((select jsonb_object_agg(type, n) from (
        select type, count(*) as n from x where st <> 'closed' group by type) t), '{}'::jsonb)
  )
$$;
