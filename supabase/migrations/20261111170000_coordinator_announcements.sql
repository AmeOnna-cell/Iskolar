drop policy "announcements: staff post" on public.announcements;

create policy "announcements: admins and assigned coordinators post"
on public.announcements for insert to authenticated
with check (
  (select public.is_admin()) or (
    (select public.is_staff()) and author_id = (select auth.uid())
    and exists (
      select 1 from public.scholarships s
      where s.id = scholarship_id and s.assigned_coordinator_id = (select auth.uid())
      and s.listing_status = 'published'
    )
  )
);

drop policy "announcements: author or admin edits" on public.announcements;

create policy "announcements: admins and assigned authors edit"
on public.announcements for update to authenticated
using (
  (select public.is_admin()) or (
    (select public.is_staff()) and author_id = (select auth.uid())
    and exists (
      select 1 from public.scholarships s
      where s.id = scholarship_id and s.assigned_coordinator_id = (select auth.uid())
      and s.listing_status = 'published'
    )
  )
)
with check (
  (select public.is_admin()) or (
    (select public.is_staff()) and author_id = (select auth.uid())
    and exists (
      select 1 from public.scholarships s
      where s.id = scholarship_id and s.assigned_coordinator_id = (select auth.uid())
      and s.listing_status = 'published'
    )
  )
);
