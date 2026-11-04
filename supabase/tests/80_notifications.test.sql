-- Phase 6: who gets told what. Preferences, idempotency (dedupe keys), the four triggers, the
-- dispatcher's claim lease, and that none of it is reachable from the browser.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.new_user(p_email text, p_role public.app_role default 'student') returns uuid
language plpgsql as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
  values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, now(), now());
  if p_role <> 'student' then update public.profiles set role = p_role where id = uid; end if;
  return uid;
end $$;
create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

create temp table ids as
select pg_temp.new_user('ana@notify.test') as ana,          -- engineering, wants everything
       pg_temp.new_user('ben@notify.test') as ben,          -- engineering, topics and email off
       pg_temp.new_user('carla@notify.test', 'coordinator') as carla,
       (select id from public.providers where abbr = 'CHED') as ched;
grant select on ids to authenticated;
insert into public.student_profiles (user_id, field, year_level, gwa) select ana, 'engineering', 2, 1.75 from ids;
insert into public.student_profiles (user_id, field, year_level, gwa) select ben, 'engineering', 2, 1.75 from ids;
update public.notification_preferences set email = false, site = false, new_matches = false, changes = false
 where user_id = (select ben from ids);

create function pg_temp.n(p_user uuid, p_kind text) returns int language sql as $$
  select count(*)::int from public.notifications where user_id = p_user and kind::text = p_kind
$$;

-- ---------- notify() ----------

select ok(public.notify((select ana from ids), 'deadline', 'T', 'B', '/s/x', 'test:1'), 'notify creates an alert');
select ok(not public.notify((select ana from ids), 'deadline', 'T', 'B', '/s/x', 'test:1'), 'The same dedupe key never creates a second one');
select results_eq($$ select email_status::text, push_status::text, read_at is null from public.notifications where dedupe_key = 'test:1' $$,
  $$ values ('pending', 'skipped', true) $$, 'Email on: queued for email; no push device: push skipped; unread');
select ok(public.notify((select ben from ids), 'deadline', 'T', 'B', null, 'test:2'), 'Deadline alerts have no topic switch');
select results_eq($$ select email_status::text, read_at is not null from public.notifications where dedupe_key = 'test:2' $$,
  $$ values ('skipped', true) $$, 'Email off: not emailed; on-site off: stored already read (no badge)');
select ok(not public.notify((select ben from ids), 'change', 'T', 'B', null, 'test:3'), 'Changes switched off: no alert');
select ok(not public.notify((select carla from ids), 'announce', 'T', 'B', null, 'test:4'), 'Staff accounts get no alerts');
update public.profiles set status = 'deactivated', deactivated_at = now() where id = (select ben from ids);
select ok(not public.notify((select ben from ids), 'deadline', 'T', 'B', null, 'test:5'), 'Deactivated accounts get no alerts');
update public.profiles set status = 'active', deactivated_at = null where id = (select ben from ids);

-- ---------- (a) Deadline reminders ----------

insert into public.scholarships (slug, provider_id, name, amount_text, source_label, listing_status, opens_on, closes_on)
select 'notify-closing', ched, 'Closing Soon Grant', '₱5,000', 'Test', 'published', public.manila_today() - 10, public.manila_today() + 3 from ids;
create temp table s1 as select id from public.scholarships where slug = 'notify-closing';
grant select on s1 to authenticated;
insert into public.scholarship_documents (scholarship_id, position, name) select id, 0, 'COR' from s1;
insert into public.scholarship_documents (scholarship_id, position, name) select id, 1, 'Grades' from s1;
insert into public.applications (student_id, scholarship_id, stage) select ana, (select id from s1), 'preparing' from ids;
insert into public.applications (student_id, scholarship_id, stage) select ben, (select id from s1), 'saved' from ids;
update public.notification_preferences set lead_days = 1 where user_id = (select ben from ids);
insert into public.application_documents (application_id, document_id)
select a.id, d.id from public.applications a join public.scholarship_documents d on d.scholarship_id = a.scholarship_id and d.position = 0
 where a.student_id = (select ana from ids) and a.scholarship_id = (select id from s1);

select ok(public.enqueue_deadline_reminders() >= 1, 'The daily job creates reminders');
select results_eq(
  $$ select title, body, link from public.notifications where user_id = (select ana from ids) and kind = 'deadline' and dedupe_key like 'deadline:%' $$,
  $$ values ('Closing Soon Grant closes in 3 days', '1 document still to prepare.', '/s/notify-closing') $$,
  'A reminder within the lead time names the days left and the unchecked documents');
select is((select payload ->> 'documents_left' from public.notifications where user_id = (select ana from ids) and dedupe_key like 'deadline:%'), '1',
  'The email data comes with it');
select is(pg_temp.n((select ben from ids), 'deadline'), 1, 'Not yet inside a 1-day lead time: only the earlier test alert');
select is(public.enqueue_deadline_reminders(), 0, 'Running the job again the same day adds nothing');

-- ---------- (b) Changes ----------

update public.scholarships set closes_on = public.manila_today() + 5 where id = (select id from s1);
select results_eq(
  $$ select payload ->> 'change', payload ->> 'new_closes_on' from public.notifications where user_id = (select ana from ids) and kind = 'change' $$,
  $$ values ('deadline', (public.manila_today() + 5)::text) $$, 'Moving the deadline tells students tracking it');
select ok((select notified_at is not null from public.deadline_changes where scholarship_id = (select id from s1) order by changed_at desc limit 1),
  'The deadline change is marked as notified');
select is(pg_temp.n((select ben from ids), 'change'), 0, 'Not for a student who switched changes off');
select ok(public.enqueue_deadline_reminders() >= 1, 'A moved deadline gets a fresh reminder');

insert into public.scholarship_documents (scholarship_id, position, name) select id, 2, 'Barangay certificate' from s1;
insert into public.scholarship_documents (scholarship_id, position, name) select id, 3, 'ID' from s1;
select is((select count(*)::int from public.notifications where user_id = (select ana from ids) and payload ->> 'change' = 'requirements'), 1,
  'New documents: one "requirements updated" alert per listing per day, however many rows changed');

-- ---------- (c) New matches ----------

insert into public.scholarships (slug, provider_id, name, amount_text, source_label, closes_on)
select 'notify-match', ched, 'Engineering Match Grant', '₱8,000', 'Test', public.manila_today() + 30 from ids;
insert into public.scholarship_criteria (scholarship_id, fields) select id, '{engineering}' from public.scholarships where slug = 'notify-match';
select is((select count(*)::int from public.notifications where link = '/s/notify-match'), 0, 'Drafts notify nobody');
update public.scholarships set listing_status = 'published' where slug = 'notify-match';
select results_eq($$ select title, payload ->> 'verdict' from public.notifications where user_id = (select ana from ids) and link = '/s/notify-match' $$,
  $$ values ('New scholarship: Engineering Match Grant', 'yes') $$, 'Publishing a listing tells matching students');
select is(pg_temp.n((select ben from ids), 'new'), 0, 'Not students who switched new matches off');
update public.scholarships set listing_status = 'archived' where slug = 'notify-match';
update public.scholarships set listing_status = 'published' where slug = 'notify-match';
select is((select count(*)::int from public.notifications where user_id = (select ana from ids) and link = '/s/notify-match'), 1, 'Re-publishing never repeats it');

-- ---------- (d) Announcements ----------

insert into public.announcements (title, body, posted_as) values ('Forms at window 3', 'This week only.', 'City Scholarship Office');
select results_eq($$ select title, payload ->> 'from' from public.notifications where user_id = (select ana from ids) and kind = 'announce' $$,
  $$ values ('Forms at window 3', 'City Scholarship Office') $$, 'Announcements reach every student');
select is(pg_temp.n((select carla from ids), 'announce'), 0, 'Not staff');

-- ---------- Delivery ----------

-- Only this test's rows in the queue (other local data is untouched once the test rolls back).
update public.notifications set email_status = 'skipped', push_status = 'skipped'
 where user_id not in (select ana from ids union all select ben from ids) and (email_status = 'pending' or push_status = 'pending');
create temp table claimed as select id, user_id from public.claim_notifications(500);
select ok((select count(*) from claimed where user_id = (select ana from ids)) >= 4, 'The dispatcher claims what is waiting');
select ok((select bool_and(claimed_at is not null) from public.notifications where id in (select id from claimed)), 'Claimed rows carry a lease');
select is((select count(*)::int from public.claim_notifications(500) where id in (select id from claimed)), 0,
  'An overlapping run doesn''t claim the same rows');
select lives_ok($$ select public.call_dispatch() $$, 'call_dispatch queues one HTTP request to the app (Vault secrets set locally)');

-- ---------- Not reachable from the browser ----------

select pg_temp.act_as((select ana from ids));
select throws_ok($$ select public.notify(auth.uid(), 'deadline', 'x', 'x', null, 'mine') $$, '42501', null, 'Students can''t create alerts');
select throws_ok($$ select * from public.claim_notifications(10) $$, '42501', null, 'Students can''t claim deliveries');
select throws_ok($$ select public.enqueue_deadline_reminders() $$, '42501', null, 'Students can''t run the reminder job');
select throws_ok($$ insert into public.notifications (user_id, kind, title, dedupe_key) values (auth.uid(), 'new', 'x', 'x') $$, '42501', null,
  'Students can''t insert alerts directly');
select is((select count(*)::int from public.notifications where user_id <> auth.uid()), 0, 'Students only see their own alerts');
reset role;

select ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications'),
  'Alerts stream to the badge through Realtime');
select results_eq($$ select jobname, schedule from cron.job where jobname like 'iskolar-%' order by 1 $$,
  $$ values ('iskolar-daily-reminders'::text, '0 23 * * *'::text), ('iskolar-dispatch', '*/10 * * * *') $$,
  'Daily reminders at 07:00 Manila (23:00 UTC) and a 10-minute delivery run');

select * from finish();
rollback;
