-- User management guards (self, last admin, deleted accounts), soft delete, audit, and the auth hook.
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

create temp table ids as
select pg_temp.new_user('xandra@iskolar.ph', 'admin') as xandra,
       pg_temp.new_user('yuri@iskolar.ph', 'admin') as yuri,
       pg_temp.new_user('sam@test.ph') as sam,
       pg_temp.new_user('tina@test.ph') as tina;
grant select on ids to authenticated;

-- Sign-up never grants a role from metadata.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'sneaky@test.ph', '{"full_name":"Sneaky","role":"admin"}', now(), now());
select is((select role::text from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'student',
  'A new account is always a student, even if sign-up metadata says admin');
select is((select count(*)::int from public.notification_preferences where user_id = '11111111-1111-1111-1111-111111111111'), 1,
  'A new account gets default notification preferences');

insert into public.student_profiles (user_id, field, gwa) select sam, 'education', 2.00 from ids;
insert into public.applications (student_id, scholarship_id)
select sam, id from public.scholarships, ids where slug = 'tulong-dunong-program';
insert into public.inquiries (student_id, question, student_context) select sam, 'When is the TES payout?', 'BSEd, 3rd year' from ids;

select pg_temp.act_as((select xandra from ids));

-- Self-protection
select results_eq($$ select ok, error from public.batch_users_status(array[(select xandra from ids)], 'deactivated') $$,
  $$ values (false, 'You can''t deactivate your own account') $$, 'An admin cannot deactivate themselves');
select throws_ok($$ select public.admin_soft_delete_user((select xandra from ids)) $$,
  '42501', 'You can''t delete your own account', 'An admin cannot delete themselves');
select throws_ok($$ select public.admin_set_role((select xandra from ids), 'coordinator') $$,
  '42501', 'You can''t remove your own admin role', 'An admin cannot demote themselves');

-- Batch deactivate with mixed results
select results_eq(
  $$ select ok from public.batch_users_status(array[(select sam from ids), (select tina from ids), (select yuri from ids)], 'deactivated') order by ok $$,
  $$ values (true), (true), (true) $$, 'Admins can deactivate students and other admins in one batch');
select results_eq($$ select ok, error from public.batch_users_status(array[(select sam from ids)], 'deactivated') $$,
  $$ values (false, 'Already deactivated') $$, 'Deactivating twice is reported, not repeated');
select is((select deactivated_by from public.profiles where id = (select sam from ids)), (select xandra from ids),
  'Deactivation records who did it');

-- Xandra is now the only active admin; Yuri (deactivated) cannot act.
select pg_temp.act_as((select yuri from ids));
select throws_ok($$ select * from public.batch_users_status(array[(select xandra from ids)], 'deactivated') $$,
  '42501', 'Only an admin can do this', 'A deactivated admin has no admin powers');
select is((select count(*)::int from public.audit_logs), 0, 'A deactivated admin cannot read the audit log');

select pg_temp.act_as((select xandra from ids));
select results_eq($$ select ok from public.batch_users_status(array[(select yuri from ids), (select tina from ids)], 'active') $$,
  $$ values (true), (true) $$, 'Admins can reactivate accounts');
select is((select deactivated_at from public.profiles where id = (select tina from ids)), null, 'Reactivation clears the deactivation date');
select lives_ok($$ select public.admin_set_role((select tina from ids), 'coordinator') $$, 'Admins can promote a student');
select throws_ok($$ select public.admin_set_role((select sam from ids), 'coordinator') $$,
  '22023', 'Reactivate the account before changing its role', 'Roles of deactivated accounts cannot change');

-- Soft delete: personal data removed, tombstone kept
select lives_ok($$ select public.admin_soft_delete_user((select sam from ids)) $$, 'Admins can delete a student');
reset role;
select results_eq(
  $$ select status::text, full_name, email from public.profiles where id = (select sam from ids) $$,
  $$ values ('deleted', null::text, null::text) $$, 'The deleted profile is anonymised and kept as a tombstone');
select is((select count(*)::int from public.student_profiles where user_id = (select sam from ids)), 0, 'Eligibility answers are removed');
select is((select count(*)::int from public.applications where student_id = (select sam from ids)), 0, 'Applications are removed');
select is((select count(*)::int from public.notification_preferences where user_id = (select sam from ids)), 0, 'Preferences are removed');
select is((select student_context from public.inquiries where question = 'When is the TES payout?'), 'Deleted account',
  'Questions stay for staff, without the student''s details');
select results_eq($$ select ok, error from public.batch_users_status(array[(select sam from ids)], 'active') $$,
  $$ values (false, 'Deleted accounts can''t be changed') $$, 'A deleted account cannot be reactivated');

-- Audit trail
select is(
  (select array_agg(action order by id) from public.audit_logs where actor_id = (select xandra from ids)),
  array['user.deactivate', 'user.deactivate', 'user.deactivate', 'user.reactivate', 'user.reactivate', 'user.role_change', 'user.delete'],
  'Every user-management action is audited, one row per account');
select is(
  (select after ->> 'role' from public.audit_logs where action = 'user.role_change' and entity_id = (select tina::text from ids)),
  'coordinator', 'The role-change entry holds the new role');
select is(
  (select before ->> 'role' from public.audit_logs where action = 'user.role_change' and entity_id = (select tina::text from ids)),
  'student', 'The role-change entry holds the old role');
select is_empty(
  $$ select 1 from public.audit_logs where action like 'user.%' and (before ? 'email' or after ? 'email' or before ? 'full_name' or after ? 'full_name') $$,
  'User audit entries never copy names or emails');

-- Auth hook: role claim, and deactivated accounts get no token.
select is(
  public.custom_access_token_hook(jsonb_build_object('user_id', (select xandra from ids), 'claims', '{"role":"authenticated"}'::jsonb)) -> 'claims' ->> 'app_role',
  'admin', 'The access token carries the role');
update public.profiles set status = 'deactivated', deactivated_at = now() where id = (select tina from ids);
select is(
  (public.custom_access_token_hook(jsonb_build_object('user_id', (select tina from ids), 'claims', '{}'::jsonb)) -> 'error' ->> 'http_code')::int,
  403, 'A deactivated account cannot get a new token');

select * from finish();
rollback;
