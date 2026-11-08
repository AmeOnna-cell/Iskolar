-- Revisions group E: an announcement alert opens that scholarship's posts on /announcements
-- (?a=<slug>), or "General announcements" (?a=general) when it isn't about one scholarship.
-- The bell, the alerts list, email and push all follow notifications.link.

create or replace function public.notify_announcement() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  link text := '/announcements?a=' || coalesce(
    (select s.slug from public.scholarships s where s.id = new.scholarship_id), 'general');
begin
  perform public.notify_many(
    array(select p.id from public.profiles p where p.role = 'student' and p.status = 'active'),
    'announce', new.title, left(new.body, 300), link, 'announce:' || new.id,
    jsonb_build_object('title', new.title, 'body', new.body, 'from', new.posted_as)
  );
  return null;
end $$;
revoke execute on function public.notify_announcement() from public, anon, authenticated;

-- Existing alerts: point at the announcement's board entry; a deleted announcement falls back to the page.
update public.notifications n
   set link = '/announcements?a=' || coalesce(s.slug, 'general')
  from public.announcements a
  left join public.scholarships s on s.id = a.scholarship_id
 where n.kind = 'announce' and n.dedupe_key = 'announce:' || a.id;
update public.notifications
   set link = '/announcements'
 where kind = 'announce' and (link is null or link = '/dashboard');
