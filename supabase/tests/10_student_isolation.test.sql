-- A student can't read or change another student's data, and can't use staff or admin operations.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.new_user(p_email text, p_role public.app_role default 'student') returns uuid
language plpgsql as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
          jsonb_build_object('full_name', split_part(p_email, '@', 1)), now(), now());
  if p_role <> 'student' then update public.profiles set role = p_role where id = uid; end if;
  return uid;
end $$;

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

-- Fixtures (as postgres)
create temp table ids as
select pg_temp.new_user('ana@test.ph') as ana, pg_temp.new_user('ben@test.ph') as ben,
       (select id from public.scholarships where slug = 'tulong-dunong-program') as tdp;
grant select on ids to authenticated, anon;

insert into public.student_profiles (user_id, field, year_level, gwa, region)
select ana, 'science_math', 2, 1.85, 'central_luzon' from ids;
insert into public.applications (student_id, scholarship_id, stage) select ana, tdp, 'preparing' from ids;
insert into public.notifications (user_id, kind, title, dedupe_key) select ana, 'deadline', 'TDP closes in 4 days', 'test:1' from ids;
insert into public.inquiries (student_id, question) select ana, 'Is my COR enough for TDP?' from ids;
insert into public.scholarships (slug, provider_id, name, amount_text, source_label, listing_status)
select 'draft-only', provider_id, 'Draft scholarship', '₱1', 'test', 'draft' from public.scholarships where slug = 'tulong-dunong-program';

-- ---------- Ben (another student) ----------
select pg_temp.act_as((select ben from ids));

select is((select count(*)::int from public.student_profiles), 0, 'Ben cannot read Ana''s eligibility answers');
select is((select count(*)::int from public.applications), 0, 'Ben cannot read Ana''s applications');
select is((select count(*)::int from public.application_documents), 0, 'Ben cannot read Ana''s checklists');
select is((select count(*)::int from public.notifications), 0, 'Ben cannot read Ana''s notifications');
select is((select count(*)::int from public.inquiries), 0, 'Ben cannot read other students'' questions');
select is((select count(*)::int from public.profiles), 1, 'Ben can read only his own profile');
select is((select count(*)::int from public.audit_logs), 0, 'Ben cannot read the audit log');
select is((select count(*)::int from public.deadline_changes), 0, 'Ben cannot read deadline history');
select is((select count(*)::int from public.scholarships where slug = 'draft-only'), 0, 'Ben cannot see drafts');

select results_eq(
  $$ with u as (update public.applications set stage = 'submitted' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'Ben cannot change Ana''s application');
select results_eq(
  $$ with u as (delete from public.student_profiles returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'Ben cannot delete Ana''s answers');
select throws_ok(
  $$ insert into public.applications (student_id, scholarship_id) select ana, tdp from ids $$,
  '42501', null, 'Ben cannot create an application for Ana');
select is(public.mark_notifications_read((select array_agg(id) from public.notifications)), 0,
  'mark_notifications_read touches only Ben''s own rows');
select throws_ok($$ select public.evaluate_eligibility((select ana from ids), (select tdp from ids)) $$,
  '42501', null, 'Ben cannot run the eligibility check on Ana');

-- Privilege escalation
select throws_ok($$ update public.profiles set role = 'admin' where id = auth.uid() $$,
  '42501', null, 'A student cannot make themselves admin');
select throws_ok($$ update public.profiles set status = 'active' where id = auth.uid() $$,
  '42501', null, 'A student cannot change their account status');
select lives_ok($$ update public.profiles set full_name = 'Ben Santos' where id = auth.uid() $$,
  'A student can change their own name');

-- Staff and admin operations
select throws_ok(
  $$ insert into public.scholarships (slug, provider_id, name, amount_text, source_label)
     select 'ben-listing', provider_id, 'Ben''s listing', '₱1', 'x' from public.scholarships limit 1 $$,
  '42501', null, 'A student cannot create listings');
select results_eq(
  $$ with u as (update public.scholarships set name = 'Hacked' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'A student cannot edit listings');
select throws_ok($$ insert into public.scholarship_documents (scholarship_id, position, name) select tdp, 99, 'x' from ids $$,
  '42501', null, 'A student cannot add requirements to a listing');
select throws_ok($$ select * from public.batch_scholarships('publish', array[(select tdp from ids)]) $$,
  '42501', 'Only staff can change listings', 'A student cannot run batch listing actions');
select throws_ok($$ select * from public.batch_users_status(array[(select ana from ids)], 'deactivated') $$,
  '42501', 'Only an admin can do this', 'A student cannot deactivate users');
select throws_ok($$ select public.admin_set_role((select ben from ids), 'admin') $$,
  '42501', 'Only an admin can do this', 'A student cannot change roles through the admin RPC');
select throws_ok($$ select public.admin_soft_delete_user((select ana from ids)) $$,
  '42501', 'Only an admin can do this', 'A student cannot delete users');
select throws_ok($$ select public.log_audit('fake.event', 'x', '1') $$,
  '42501', null, 'A student cannot write audit entries');
select throws_ok($$ insert into public.audit_logs (action, entity_type) values ('fake', 'x') $$,
  '42501', null, 'A student cannot insert audit rows directly');
select throws_ok($$ insert into public.notifications (user_id, kind, title, dedupe_key) values (auth.uid(), 'new', 'x', 'x') $$,
  '42501', null, 'A student cannot forge notifications');
select throws_ok($$ insert into public.announcements (title, body) values ('Fake news', 'x') $$,
  '42501', null, 'A student cannot post announcements');
select throws_ok($$ select public.check_rate_limit('login:victim', 1, 60) $$,
  '42501', null, 'A student cannot touch rate-limit counters');

-- Students can ask questions; staff fields are forced.
select lives_ok($$ insert into public.inquiries (question, student_id, status) values ('Can I apply twice?', (select ana from ids), 'closed') $$,
  'A student can ask a question');
reset role;
select is((select student_id from public.inquiries where question = 'Can I apply twice?'), (select ben from ids),
  'The question is filed under the asker, whatever student_id they send');
select is((select status::text from public.inquiries where question = 'Can I apply twice?'), 'open',
  'A new question always starts open');

-- ---------- Ana sees her own data ----------
select pg_temp.act_as((select ana from ids));
select is((select count(*)::int from public.applications), 1, 'Ana sees her application');
select is((select count(*)::int from public.notifications), 1, 'Ana sees her notification');
select is((select count(*)::int from public.student_profiles), 1, 'Ana sees her answers');
select is((select count(*)::int from public.inquiries), 1, 'Ana sees only her own question');
select is(public.mark_notifications_read(null), 1, 'Ana can mark her alerts read');

-- ---------- Deactivated with a still-valid JWT ----------
reset role;
update public.profiles set status = 'deactivated', deactivated_at = now() where id = (select ana from ids);
select pg_temp.act_as((select ana from ids));
select is((select count(*)::int from public.applications), 0, 'A deactivated student loses access even with a valid JWT');
select is((select count(*)::int from public.notifications), 0, 'A deactivated student cannot read notifications');

-- ---------- Signed out ----------
reset role;
set local role anon;
select is((select count(*)::int from public.scholarships), 9, 'Visitors see the 9 published listings and no drafts');
select throws_ok($$ select count(*) from public.applications $$, '42501', null, 'Visitors cannot query applications');
select throws_ok($$ select count(*) from public.student_profiles $$, '42501', null, 'Visitors cannot query eligibility answers');
select is((select count(*)::int from public.profiles), 0, 'Visitors cannot read profiles');
reset role;

select * from finish();
rollback;
