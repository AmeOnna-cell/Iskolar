create function public.staff_inquiry_groups(p_status public.inquiry_status, p_search text, p_page integer, p_size integer)
returns table (
  group_id uuid, scholarship_id uuid, scholarship_name text, inquiry_id uuid,
  question text, created_at timestamptz, inquiry_count integer, total_count integer
)
language sql stable security invoker set search_path = '' as $$
  with matching as (
    select i.*, row_number() over (
      partition by i.scholarship_id, case when i.scholarship_id is null then i.id end
      order by
        case when p_status = 'open' then i.created_at end asc,
        case when p_status <> 'open' then i.created_at end desc,
        i.id
    ) as position,
    count(*) over (
      partition by i.scholarship_id, case when i.scholarship_id is null then i.id end
    )::integer as group_size
    from public.inquiries i
    left join public.scholarships s on s.id = i.scholarship_id
    where (select public.is_staff()) and i.status = p_status
      and (coalesce(p_search, '') = '' or strpos(lower(i.question), lower(left(p_search, 120))) > 0
        or strpos(lower(s.name), lower(left(p_search, 120))) > 0)
  )
  select coalesce(m.scholarship_id, m.id), m.scholarship_id, s.name, m.id,
    m.question, m.created_at, m.group_size, count(*) over ()::integer
  from matching m left join public.scholarships s on s.id = m.scholarship_id
  where m.position = 1
  order by
    case when p_status = 'open' then m.created_at end asc,
    case when p_status <> 'open' then m.created_at end desc,
    m.id
  limit least(greatest(p_size, 1), 50)
  offset (greatest(least(p_page, 10000), 1) - 1) * least(greatest(p_size, 1), 50);
$$;

revoke execute on function public.staff_inquiry_groups(public.inquiry_status, text, integer, integer) from public, anon;
grant execute on function public.staff_inquiry_groups(public.inquiry_status, text, integer, integer) to authenticated;
