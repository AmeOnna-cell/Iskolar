create table public.announcement_reads (
  student_id uuid not null references public.profiles (id) on delete cascade,
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  primary key (student_id, announcement_id)
);

create index announcement_reads_announcement_idx on public.announcement_reads (announcement_id);
alter table public.announcement_reads enable row level security;
revoke all on public.announcement_reads from anon, authenticated;
grant select, insert on public.announcement_reads to authenticated;

create policy "students read their announcement receipts"
on public.announcement_reads for select to authenticated
using (student_id = (select auth.uid()) and (select public.is_student()));

create policy "students mark their announcements read"
on public.announcement_reads for insert to authenticated
with check (
  student_id = (select auth.uid())
  and (select public.is_student())
  and exists (
    select 1 from public.announcements a where a.id = announcement_id
    and (a.scholarship_id is null or exists (
      select 1 from public.scholarships s where s.id = a.scholarship_id and s.listing_status = 'published'
    ))
  )
);
