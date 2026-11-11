create function public.staff_can_manage_inquiry_topic(p_scholarship uuid)
returns boolean
language sql stable security invoker set search_path = '' as $$
  select (select public.is_admin()) or (
    (select public.is_staff())
    and exists (
      select 1 from public.scholarships s
      where s.id = p_scholarship and s.assigned_coordinator_id = (select auth.uid())
    )
  );
$$;

revoke execute on function public.staff_can_manage_inquiry_topic(uuid) from public, anon;
grant execute on function public.staff_can_manage_inquiry_topic(uuid) to authenticated;

drop policy "inquiries: asker and staff read" on public.inquiries;
create policy "inquiries: asker and assigned staff read"
on public.inquiries for select to authenticated
using (
  (student_id = (select auth.uid()) and (select public.is_student()))
  or public.staff_can_manage_inquiry_topic(scholarship_id)
);

drop policy "inquiries: staff update status" on public.inquiries;
create policy "inquiries: assigned staff update status"
on public.inquiries for update to authenticated
using (public.staff_can_manage_inquiry_topic(scholarship_id))
with check (public.staff_can_manage_inquiry_topic(scholarship_id));

drop policy "inquiry_replies: staff and the asker read" on public.inquiry_replies;
create policy "inquiry_replies: visible inquiry read"
on public.inquiry_replies for select to authenticated
using (exists (select 1 from public.inquiries i where i.id = inquiry_id));

drop policy "inquiry_replies: staff reply" on public.inquiry_replies;
create policy "inquiry_replies: assigned staff reply"
on public.inquiry_replies for insert to authenticated
with check (
  (select public.is_staff())
  and exists (select 1 from public.inquiries i where i.id = inquiry_id)
);

drop policy "inquiry_replies: author or admin edits" on public.inquiry_replies;
create policy "inquiry_replies: assigned author or admin edits"
on public.inquiry_replies for update to authenticated
using (
  (select public.is_admin()) or (
    (select public.is_staff()) and author_id = (select auth.uid())
    and exists (select 1 from public.inquiries i where i.id = inquiry_id)
  )
)
with check (
  (select public.is_admin()) or (
    (select public.is_staff()) and author_id = (select auth.uid())
    and exists (select 1 from public.inquiries i where i.id = inquiry_id)
  )
);

drop policy "inquiry_replies: author or admin deletes" on public.inquiry_replies;
create policy "inquiry_replies: assigned author or admin deletes"
on public.inquiry_replies for delete to authenticated
using (
  (select public.is_admin()) or (
    (select public.is_staff()) and author_id = (select auth.uid())
    and exists (select 1 from public.inquiries i where i.id = inquiry_id)
  )
);
