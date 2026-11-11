-- Group only scholarship inquiries. General questions remain separate conversations.
create view public.student_inquiry_threads with (security_invoker = true) as
with ranked as (
  select i.id, i.student_id, i.scholarship_id, i.created_at,
         row_number() over (thread order by i.created_at desc, i.id desc) as position,
         case
           when bool_or(i.status = 'open') over thread then 'open'::public.inquiry_status
           when bool_or(i.status = 'answered') over thread then 'answered'::public.inquiry_status
           else 'closed'::public.inquiry_status
         end as status
  from public.inquiries i
  window thread as (partition by i.student_id, i.scholarship_id, case when i.scholarship_id is null then i.id end)
)
select r.id, r.student_id, r.scholarship_id, r.created_at, r.status, s.name as scholarship_name
from ranked r
left join public.scholarships s on s.id = r.scholarship_id
where r.position = 1;

revoke all on public.student_inquiry_threads from anon, authenticated;
grant select on public.student_inquiry_threads to authenticated;
