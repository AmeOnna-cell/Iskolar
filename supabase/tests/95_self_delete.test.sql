-- Self-service deletion (delete_my_account) and the shared anonymize step: a signed-in user can delete
-- only themselves, with their email and current password; the admin delete path keeps its guards.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.new_user(p_email text, p_role public.app_role default 'student', p_password text default 'Correct-horse-1')
returns uuid language plpgsql as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
  values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
          extensions.crypt(p_password, extensions.gen_salt('bf')),
          jsonb_build_object('full_name', split_part(p_email, '@', 1)), now(), now());
  if p_role <> 'student' then update public.profiles set role = p_role where id = uid; end if;
  insert into auth.sessions (id, user_id, created_at, updated_at) values (gen_random_uuid(), uid, now(), now());
  return uid;
end $$;

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

create temp table ids as
select pg_temp.new_user('ana.self@test.ph') as ana,
       pg_temp.new_user('ben.self@test.ph') as ben,
       pg_temp.new_user('cora.self@test.ph') as cora,
       pg_temp.new_user('ada.self@iskolar.ph', 'admin') as ada,
       pg_temp.new_user('bo.self@iskolar.ph', 'admin') as bo;
grant select on ids to authenticated;

insert into public.student_profiles (user_id, field, gwa) select ana, 'education', 2.00 from ids;
insert into public.student_profiles (user_id, field, gwa) select ben, 'engineering', 1.75 from ids;
insert into public.applications (student_id, scholarship_id) select ana, id from public.scholarships, ids where slug = 'tulong-dunong-program';
insert into public.applications (student_id, scholarship_id) select ben, id from public.scholarships, ids where slug = 'tulong-dunong-program';
insert into public.inquiries (student_id, question, student_context) select ana, 'Is the COR enough?', 'BSEd, 2nd year' from ids;

-- ---------- Who can call what ----------
select ok(not has_function_privilege('anon', 'public.anonymize_account(uuid, uuid)', 'execute'), 'anon cannot run the shared anonymize step');
select ok(not has_function_privilege('authenticated', 'public.anonymize_account(uuid, uuid)', 'execute'), 'signed-in users cannot run the shared anonymize step');
select ok(not has_function_privilege('service_role', 'public.anonymize_account(uuid, uuid)', 'execute'), 'the service role cannot run the shared anonymize step directly');
select ok(not has_function_privilege('anon', 'public.delete_my_account(text, text)', 'execute'), 'anon cannot call delete_my_account');
select ok(has_function_privilege('authenticated', 'public.delete_my_account(text, text)', 'execute'), 'signed-in users can call delete_my_account');
select is((select proargnames from pg_proc where oid = 'public.delete_my_account(text, text)'::regprocedure), array['p_email', 'p_password'],
  'delete_my_account takes no target: it can only ever act on auth.uid()');

-- ---------- The admin path keeps its guards ----------
select pg_temp.act_as((select ana from ids));
select throws_ok($$ select public.admin_soft_delete_user((select ben from ids)) $$, '42501', 'Only an admin can do this',
  'A student still cannot use the admin delete');
select throws_ok($$ select public.anonymize_account((select ben from ids), (select ana from ids)) $$, '42501', null,
  'A student cannot reach the shared anonymize step over the API');
select pg_temp.act_as((select ada from ids));
select throws_ok($$ select public.admin_soft_delete_user((select ada from ids)) $$, '42501', 'You can''t delete your own account',
  'An admin still cannot delete themselves through the admin path');
select lives_ok($$ select public.admin_soft_delete_user((select cora from ids)) $$, 'An admin can still delete a student');
select throws_ok($$ select public.admin_soft_delete_user((select cora from ids)) $$, '22023', 'Already deleted', 'Deleting twice is refused');
reset role;
select is((select status::text || coalesce(email, '∅') from public.profiles where id = (select cora from ids)), 'deleted∅',
  'The admin path still anonymises through the shared step');
select is((select deactivated_by from public.profiles where id = (select cora from ids)), (select ada from ids),
  'The admin path records the admin as the actor');

-- ---------- A student deletes themselves, and only themselves ----------
select pg_temp.act_as((select ana from ids));
select throws_ok($$ select public.delete_my_account('ben.self@test.ph', 'Correct-horse-1') $$, '22023',
  'The email you typed doesn''t match your account', 'Typing someone else''s email is refused');
select is(public.delete_my_account('ana.self@test.ph', 'wrong-password'), 'wrong_password', 'A wrong current password is refused');
reset role;
select is((select status::text from public.profiles where id = (select ana from ids)), 'active', 'Nothing is deleted after a wrong password');
select is((select count(*)::int from public.student_profiles where user_id = (select ana from ids)), 1, 'Answers are kept after a wrong password');

select pg_temp.act_as((select ana from ids));
select is(public.delete_my_account(' ANA.self@test.ph ', 'Correct-horse-1'), 'deleted', 'Email (any case) and current password delete the account');
reset role;
select is((select status::text || coalesce(full_name, '∅') || coalesce(email, '∅') from public.profiles where id = (select ana from ids)),
  'deleted∅∅', 'Own profile becomes an anonymised tombstone');
select is((select count(*)::int from public.student_profiles where user_id = (select ana from ids)), 0, 'Own answers are deleted');
select is((select count(*)::int from public.applications where student_id = (select ana from ids)), 0, 'Own tracker is deleted');
select is((select student_context from public.inquiries where student_id = (select ana from ids)), 'Deleted account', 'Own questions lose their context');
select is((select count(*)::int from auth.sessions where user_id = (select ana from ids)), 0, 'Every own session is ended');
select is((select status::text from public.profiles where id = (select ben from ids)), 'active', 'Another student is untouched');
select is((select count(*)::int from public.student_profiles where user_id = (select ben from ids)), 1, 'Another student''s answers are untouched');
select is((select count(*)::int from public.applications where student_id = (select ben from ids)), 1, 'Another student''s tracker is untouched');
select is((select count(*)::int from auth.sessions where user_id = (select ben from ids)), 1, 'Another student''s sessions are untouched');
select is((select count(*)::int from public.audit_logs where action = 'user.self_delete' and actor_id = (select ana from ids) and entity_id = (select ana::text from ids)),
  1, 'The self-delete is in the audit log, in the student''s own name');
select is((select count(*)::int from public.audit_logs where action = 'user.delete' and entity_id = (select ana::text from ids)), 1,
  'The status change is audited as usual');

select pg_temp.act_as((select ana from ids));
select throws_ok($$ select public.delete_my_account('ana.self@test.ph', 'Correct-horse-1') $$, '42501',
  'This account can''t be deleted', 'A deleted account cannot run it again');

-- ---------- Password attempts are limited ----------
select pg_temp.act_as((select ben from ids));
select public.delete_my_account('ben.self@test.ph', 'nope') from generate_series(1, 5);
select is(public.delete_my_account('ben.self@test.ph', 'Correct-horse-1'), 'too_many_attempts',
  'After 5 tries in an hour even the right password waits');
reset role;
select is((select status::text from public.profiles where id = (select ben from ids)), 'active', 'The account stays after too many attempts');

-- ---------- Admins: allowed while another admin is active, never the last one ----------
select pg_temp.act_as((select bo from ids));
select is(public.delete_my_account('bo.self@iskolar.ph', 'Correct-horse-1'), 'deleted', 'An admin can delete themselves while another admin is active');
reset role;
update public.profiles set role = 'student' where role = 'admin' and id <> (select ada from ids);
select pg_temp.act_as((select ada from ids));
select throws_ok($$ select public.delete_my_account('ada.self@iskolar.ph', 'Correct-horse-1') $$, '42501',
  'You''re the last active admin. Make someone else an admin first.', 'The last active admin cannot delete themselves');
reset role;

select * from finish();
rollback;
