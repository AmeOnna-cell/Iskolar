-- Phase 6: notifications. The database decides who is told what (idempotently, through
-- notifications.dedupe_key); /api/cron/dispatch delivers email (src/lib/email) and web push.
--
--   (a) deadline reminders   enqueue_deadline_reminders(), daily at 07:00 Asia/Manila
--   (b) changes              deadline_changes insert; criteria / documents edits on published listings
--   (c) new matches          a listing becomes published
--   (d) announcements        announcement insert

-- ---------- Columns ----------

alter table public.notifications
  -- Data the email/push templates need (names, dates, counts), captured when the event happens.
  add column payload jsonb not null default '{}'::jsonb,
  -- Dispatcher lease: a row claimed less than 10 minutes ago isn't picked up by an overlapping run.
  add column claimed_at timestamptz;

-- The dispatcher's queue scan: only rows with something left to deliver.
drop index if exists public.notifications_email_pending_idx;
create index notifications_dispatch_idx on public.notifications (created_at)
  where email_status = 'pending' or push_status = 'pending';

-- Live unread badge (Realtime applies the table's RLS: students only receive their own rows).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ---------- notify(): the one place that applies preferences ----------

-- Creates one notification unless the student switched that topic off or it already exists.
-- On-site off: the row is stored already read, so it never lights the badge.
create function public.notify(
  p_user uuid, p_kind public.notification_kind, p_title text, p_body text, p_link text,
  p_dedupe text, p_payload jsonb default '{}'::jsonb
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  pr public.notification_preferences;
  n integer;
begin
  select np.* into pr
    from public.notification_preferences np
    join public.profiles p on p.id = np.user_id
   where np.user_id = p_user and p.status = 'active' and p.role = 'student';
  if not found then return false; end if;
  if (p_kind = 'new' and not pr.new_matches) or (p_kind = 'change' and not pr.changes) then return false; end if;

  insert into public.notifications (user_id, kind, title, body, link, dedupe_key, payload, read_at, email_status, push_status)
  values (
    p_user, p_kind, left(p_title, 200), left(coalesce(p_body, ''), 1000), p_link, left(p_dedupe, 200), p_payload,
    case when pr.site then null else now() end,
    (case when pr.email then 'pending' else 'skipped' end)::public.delivery_status,
    (case when pr.push and exists (select 1 from public.push_subscriptions s where s.user_id = p_user)
          then 'pending' else 'skipped' end)::public.delivery_status
  )
  on conflict (user_id, dedupe_key) do nothing;
  get diagnostics n = row_count;
  return n > 0;
end $$;

create function public.manila_today() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Asia/Manila')::date
$$;

create function public.days_text(p_days integer) returns text
language sql immutable set search_path = '' as $$
  select case when p_days <= 0 then 'today' when p_days = 1 then 'tomorrow' else 'in ' || p_days || ' days' end
$$;

-- ---------- (a) Deadline reminders ----------

-- Saved or preparing applications whose listing closes within the student's lead time (1/3/7/14 days).
-- One reminder per student × listing × deadline × lead time: re-running the job the same day, or the
-- next day, adds nothing; a moved deadline or a new lead time gets a fresh reminder.
create function public.enqueue_deadline_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  today date := public.manila_today();
  r record;
  n integer := 0;
begin
  for r in
    select a.student_id, s.id as sid, s.slug, s.name, s.closes_on, pr.lead_days,
           coalesce(pv.short_name, pv.name) as provider,
           (s.closes_on - today) as days_left,
           (select count(*) from public.scholarship_documents d where d.scholarship_id = s.id)::int as docs_total,
           (select count(*) from public.scholarship_documents d
             where d.scholarship_id = s.id
               and not exists (select 1 from public.application_documents ad
                                where ad.application_id = a.id and ad.document_id = d.id))::int as docs_left
      from public.applications a
      join public.scholarships s on s.id = a.scholarship_id
      join public.providers pv on pv.id = s.provider_id
      join public.notification_preferences pr on pr.user_id = a.student_id
     where a.stage in ('saved', 'preparing')
       and s.listing_status = 'published'
       and s.closes_on between today and today + pr.lead_days
       and (s.opens_on is null or s.opens_on <= today)
  loop
    if public.notify(
      r.student_id, 'deadline',
      r.name || ' closes ' || public.days_text(r.days_left),
      case when r.docs_left > 0
           then r.docs_left || case when r.docs_left = 1 then ' document' else ' documents' end || ' still to prepare.'
           else 'All documents ready. Submit before the deadline.' end,
      '/s/' || r.slug,
      'deadline:' || r.sid || ':' || r.closes_on || ':' || r.lead_days,
      jsonb_build_object('scholarship_name', r.name, 'provider_name', r.provider, 'closes_on', r.closes_on,
                         'documents_left', r.docs_left, 'documents_total', r.docs_total, 'path', '/s/' || r.slug)
    ) then
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- ---------- (b) Changes on a tracked listing ----------

-- Students tracking a published listing: saved or preparing (submitted applications are done).
create function public.trackers(p_scholarship uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select a.student_id from public.applications a
   where a.scholarship_id = p_scholarship and a.stage in ('saved', 'preparing')
     and exists (select 1 from public.scholarships s where s.id = p_scholarship and s.listing_status = 'published')
$$;

create function public.notify_deadline_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  s record;
  uid uuid;
begin
  if new.old_closes_on is null or new.new_closes_on is null or new.old_closes_on = new.new_closes_on then
    return null;
  end if;
  select sc.slug, sc.name, coalesce(pv.short_name, pv.name) as provider into s
    from public.scholarships sc join public.providers pv on pv.id = sc.provider_id
   where sc.id = new.scholarship_id;
  for uid in select public.trackers(new.scholarship_id) loop
    perform public.notify(
      uid, 'change', s.name || ': deadline moved',
      'New deadline is ' || to_char(new.new_closes_on, 'FMMon FMDD, YYYY') || ' (was ' || to_char(new.old_closes_on, 'FMMon FMDD, YYYY') || ').',
      '/s/' || s.slug,
      'change:' || new.scholarship_id || ':deadline:' || new.new_closes_on,
      jsonb_build_object('change', 'deadline', 'scholarship_name', s.name, 'provider_name', s.provider,
                         'previous_closes_on', new.old_closes_on, 'new_closes_on', new.new_closes_on, 'path', '/s/' || s.slug)
    );
  end loop;
  update public.deadline_changes set notified_at = now() where id = new.id;
  return null;
end $$;

create trigger deadline_changes_notify after insert on public.deadline_changes
  for each row execute function public.notify_deadline_change();

-- Requirements (criteria) or the document list changed: at most one alert per listing per day,
-- however many rows one save touches.
create function public.notify_requirements_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := case when tg_op = 'DELETE' then old.scholarship_id else new.scholarship_id end;
  s record;
  uid uuid;
begin
  if not exists (select 1 from public.trackers(sid)) then return null; end if;
  select sc.slug, sc.name, coalesce(pv.short_name, pv.name) as provider into s
    from public.scholarships sc join public.providers pv on pv.id = sc.provider_id
   where sc.id = sid;
  for uid in select public.trackers(sid) loop
    perform public.notify(
      uid, 'change', s.name || ': requirements updated',
      'Check the requirements and your document checklist again.',
      '/s/' || s.slug,
      'change:' || sid || ':requirements:' || public.manila_today(),
      jsonb_build_object('change', 'requirements', 'scholarship_name', s.name, 'provider_name', s.provider, 'path', '/s/' || s.slug)
    );
  end loop;
  return null;
end $$;

create trigger scholarship_criteria_notify after update on public.scholarship_criteria
  for each row when (old is distinct from new) execute function public.notify_requirements_change();
create trigger scholarship_documents_notify after insert or update or delete on public.scholarship_documents
  for each row execute function public.notify_requirements_change();

-- ---------- (c) A newly published listing that matches ----------

-- ponytail: evaluates every student with answers on each publish (O(students)); move to a queued
-- job if publishing starts taking noticeably long.
create function public.notify_new_match() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c public.scholarship_criteria;
  pv record;
  sp public.student_profiles;
  verdict text;
begin
  if new.closes_on is not null and new.closes_on < public.manila_today() then return null; end if;
  select * into c from public.scholarship_criteria where scholarship_id = new.id;
  select coalesce(p.short_name, p.name) as name into pv from public.providers p where p.id = new.provider_id;
  for sp in
    select st.* from public.student_profiles st
      join public.profiles p on p.id = st.user_id and p.status = 'active' and p.role = 'student'
  loop
    verdict := (public.eligibility_summary(public.eligibility_items(sp, c), true)).verdict;
    continue when verdict not in ('yes', 'maybe');
    perform public.notify(
      sp.user_id, 'new', 'New scholarship: ' || new.name,
      case when verdict = 'yes' then 'Matches your profile.' else new.amount_text || '. Check if you qualify.' end,
      '/s/' || new.slug,
      'new:' || new.id,
      jsonb_build_object('scholarship_name', new.name, 'provider_name', pv.name, 'amount', new.amount_text,
                         'verdict', verdict, 'closes_on', new.closes_on, 'path', '/s/' || new.slug)
    );
  end loop;
  return null;
end $$;

-- Re-publishing never repeats it (dedupe new:{id}).
create trigger scholarships_notify_new_match_insert after insert on public.scholarships
  for each row when (new.listing_status = 'published')
  execute function public.notify_new_match();
create trigger scholarships_notify_new_match_update after update of listing_status on public.scholarships
  for each row when (new.listing_status = 'published' and old.listing_status <> 'published')
  execute function public.notify_new_match();

-- ---------- (d) Announcements ----------

-- ponytail: fans out to every active student in the posting transaction; fine for a campus,
-- batch it in the dispatcher if there are tens of thousands of students.
create function public.notify_announcement() returns trigger
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  for uid in select p.id from public.profiles p where p.role = 'student' and p.status = 'active' loop
    perform public.notify(
      uid, 'announce', new.title, left(new.body, 300), '/dashboard',
      'announce:' || new.id,
      jsonb_build_object('title', new.title, 'body', new.body, 'from', new.posted_as)
    );
  end loop;
  return null;
end $$;

create trigger announcements_notify after insert on public.announcements
  for each row execute function public.notify_announcement();

-- ---------- Delivery (service role only) ----------

-- Claims up to p_limit rows with something left to deliver, most urgent kind first.
create function public.claim_notifications(p_limit integer default 100) returns setof public.notifications
language sql security definer set search_path = '' as $$
  update public.notifications n
     set claimed_at = now()
   where n.id in (
     select q.id from public.notifications q
      where (q.email_status = 'pending' or q.push_status = 'pending')
        and (q.claimed_at is null or q.claimed_at < now() - interval '10 minutes')
      order by case q.kind when 'deadline' then 0 when 'change' then 1 when 'new' then 2 else 3 end, q.created_at
      limit least(greatest(p_limit, 1), 500)
      for update skip locked)
  returning n.*
$$;

-- Asks the app to deliver pending notifications. The URL and shared secret live in Vault (never in
-- a migration); until both are set this does nothing. See docs/notifications.md.
create function public.call_dispatch() returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  secret text;
begin
  if not exists (select 1 from public.notifications where email_status = 'pending' or push_status = 'pending') then
    return null;
  end if;
  select decrypted_secret into base from vault.decrypted_secrets where name = 'iskolar_app_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'iskolar_cron_secret';
  if base is null or secret is null then
    raise notice 'call_dispatch: set the iskolar_app_url and iskolar_cron_secret Vault secrets first';
    return null;
  end if;
  return net.http_post(
    url := rtrim(base, '/') || '/api/cron/dispatch',
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end $$;

-- ---------- Privileges: none of this is callable from the browser ----------

do $$
declare f text;
begin
  foreach f in array array[
    'notify(uuid, public.notification_kind, text, text, text, text, jsonb)',
    'enqueue_deadline_reminders()', 'trackers(uuid)', 'claim_notifications(integer)', 'call_dispatch()',
    'notify_deadline_change()', 'notify_requirements_change()', 'notify_new_match()', 'notify_announcement()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
grant execute on function public.enqueue_deadline_reminders() to service_role;
grant execute on function public.claim_notifications(integer) to service_role;

-- ---------- Schedule (pg_cron runs in UTC: 23:00 UTC is 07:00 in Manila) ----------

select cron.schedule('iskolar-daily-reminders', '0 23 * * *',
  $$select public.enqueue_deadline_reminders(); select public.call_dispatch();$$);
-- Changes, matches and announcements go out within ~10 minutes; call_dispatch is a no-op when
-- nothing is pending, so this costs one indexed query when idle.
select cron.schedule('iskolar-dispatch', '*/10 * * * *', $$select public.call_dispatch();$$);
