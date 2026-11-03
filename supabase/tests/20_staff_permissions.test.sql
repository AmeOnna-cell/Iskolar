-- Coordinators edit only listings assigned to them and can't publish, verify, touch users or read the
-- audit log. Admins can. Every staff mutation is audited, one row per affected item.
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
select pg_temp.new_user('carla@office.ph', 'coordinator') as carla,
       pg_temp.new_user('dino@office.ph', 'coordinator') as dino,
       pg_temp.new_user('xandra@iskolar.ph', 'admin') as xandra,
       pg_temp.new_user('stu@test.ph') as stu,
       (select id from public.scholarships where slug = 'tulong-dunong-program') as tdp,
       (select id from public.scholarships where slug = 'tertiary-education-subsidy') as tes,
       (select provider_id from public.scholarships where slug = 'tulong-dunong-program') as ched;
grant select on ids to authenticated;
update public.scholarships set assigned_coordinator_id = (select carla from ids) where id = (select tdp from ids);
insert into public.student_profiles (user_id, field) select stu, 'education' from ids;

-- ---------- Carla, coordinator assigned to TDP ----------
select pg_temp.act_as((select carla from ids));

select is((select count(*)::int from public.profiles where role = 'student'), 0, 'Coordinators cannot read student profiles');
select is((select count(*)::int from public.student_profiles), 0, 'Coordinators cannot read eligibility answers');
select is((select count(*)::int from public.applications), 0, 'Coordinators cannot read applications');
select is((select count(*)::int from public.audit_logs), 0, 'Coordinators cannot read the audit log');

select lives_ok($$ update public.scholarships set closes_on = closes_on + 3 where id = (select tdp from ids) $$,
  'Carla can move the deadline of her assigned listing');
select lives_ok($$ insert into public.scholarship_documents (scholarship_id, position, name, where_to_get)
                   select tdp, 10, 'Barangay clearance', 'Your barangay hall' from ids $$,
  'Carla can add a required document to her listing');
select results_eq(
  $$ with u as (update public.scholarships set name = 'Edited' where id = (select tes from ids) returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'Carla cannot edit a listing assigned to someone else');
select throws_ok($$ insert into public.scholarship_documents (scholarship_id, position, name) select tes, 10, 'x' from ids $$,
  '42501', null, 'Carla cannot add requirements to someone else''s listing');
select throws_ok($$ update public.scholarships set verification = 'unverified' where id = (select tdp from ids) $$,
  '42501', 'Only an admin can verify a listing', 'Coordinators cannot change verification');
select throws_ok($$ update public.scholarships set last_verified_at = now() where id = (select tdp from ids) $$,
  '42501', 'Only an admin can verify a listing', 'Coordinators cannot mark a listing as re-checked');
select throws_ok($$ update public.scholarships set listing_status = 'archived' where id = (select tdp from ids) $$,
  '42501', null, 'Coordinators cannot archive');
select throws_ok($$ update public.scholarships set assigned_coordinator_id = (select dino from ids) where id = (select tdp from ids) $$,
  '42501', 'Only an admin can assign coordinators', 'Coordinators cannot reassign listings');

-- New draft: auto-assigned, cannot be self-published.
select lives_ok(
  $$ insert into public.scholarships (slug, provider_id, name, amount_text, source_label, assigned_coordinator_id)
     select 'carla-draft', ched, 'Carla''s new grant', '₱5,000', 'Office memo', dino from ids $$,
  'Carla can create a draft');
select is((select assigned_coordinator_id from public.scholarships where slug = 'carla-draft'), (select carla from ids),
  'A coordinator''s new listing is assigned to them, whatever they send');
select throws_ok(
  $$ insert into public.scholarships (slug, provider_id, name, amount_text, source_label, listing_status)
     select 'carla-live', ched, 'Instant listing', '₱5,000', 'x', 'published' from ids $$,
  '42501', 'Only an admin can publish or archive a listing', 'Coordinators cannot create published listings');
select results_eq(
  $$ select ok, error like '%Only an admin%' from public.batch_scholarships('publish', array[(select id from public.scholarships where slug = 'carla-draft')]) $$,
  $$ values (false, true) $$, 'Batch publish by a coordinator fails per row with a reason');
select results_eq(
  $$ select ok from public.batch_scholarships('submit', array[(select id from public.scholarships where slug = 'carla-draft')]) $$,
  $$ values (true) $$, 'Carla can submit her draft for verification');
select results_eq(
  $$ with d as (delete from public.scholarships where id = (select tdp from ids) returning 1) select count(*)::int from d $$,
  $$ values (0) $$, 'Coordinators cannot delete listings');

select throws_ok($$ select * from public.batch_users_status(array[(select stu from ids)], 'deactivated') $$,
  '42501', 'Only an admin can do this', 'Coordinators cannot deactivate users');
select throws_ok($$ select public.admin_set_role((select carla from ids), 'admin') $$,
  '42501', 'Only an admin can do this', 'Coordinators cannot promote themselves');
select throws_ok($$ update public.profiles set role = 'admin' where id = auth.uid() $$,
  '42501', null, 'Coordinators cannot change their role directly');

select lives_ok($$ insert into public.inquiry_replies (inquiry_id, body)
                   select id, 'Yes, you can apply to both.' from public.inquiries where question like 'Can I apply for TDP%' $$,
  'Coordinators can reply to questions');
select lives_ok($$ insert into public.announcements (title, body, posted_as) values ('TDP deadline extended', 'Three more days.', 'CHED Region III') $$,
  'Coordinators can post announcements');
select lives_ok($$ select public.log_audit('listing.viewed_history', 'scholarship', (select tdp::text from ids)) $$,
  'Staff can write an explicit audit entry as themselves');
select throws_ok($$ select public.log_audit('user.ban', 'user', 'x', null, null, (select xandra from ids)) $$,
  '42501', null, 'Staff cannot write audit entries in someone else''s name');

reset role;
select is((select status::text from public.inquiries where question like 'Can I apply for TDP%'), 'answered',
  'Replying marks the question answered');
select is((select count(*)::int from public.deadline_changes where scholarship_id = (select tdp from ids) and changed_by = (select carla from ids)), 1,
  'The deadline change is recorded with who made it');
select is(
  (select array_agg(action order by id) from public.audit_logs where actor_id = (select carla from ids)),
  array['scholarship.deadline_change', 'scholarship_document.create', 'scholarship.create', 'scholarship.submit_for_review',
        'inquiry.status_change', 'inquiry_reply.create', 'announcement.create', 'listing.viewed_history'],
  'Every coordinator mutation is in the audit log, in order');
select is(
  (select before ->> 'closes_on' <> after ->> 'closes_on' and actor_role = 'coordinator'
     from public.audit_logs where action = 'scholarship.deadline_change' and actor_id = (select carla from ids)),
  true, 'The audit entry stores before/after values and the actor''s role');

-- ---------- Xandra, admin ----------
select pg_temp.act_as((select xandra from ids));
select results_eq(
  $$ select ok from public.batch_scholarships('publish', array[(select id from public.scholarships where slug = 'carla-draft')]) $$,
  $$ values (true) $$, 'Admins can publish');
select isnt((select published_at from public.scholarships where slug = 'carla-draft'), null, 'Publishing stamps published_at');
select results_eq(
  $$ select count(*)::int from public.batch_scholarships('verify', array[(select tes from ids), (select tdp from ids)]) where ok $$,
  $$ values (2) $$, 'Admins can verify several listings in one batch');
select results_eq(
  $$ select ok, error from public.batch_scholarships('delete', array[(select id from public.scholarships where slug = 'carla-draft'), gen_random_uuid()]) order by ok desc $$,
  $$ values (true, null::text), (false, 'Not changed: not found, already in that state, or not allowed for you') $$,
  'A batch reports success and failure per row');
select is((select count(*)::int from public.audit_logs where actor_id = (select xandra from ids) and action = 'scholarship.verify'), 2,
  'One audit row per verified listing');
select is((select last_verified_by from public.scholarships where id = (select tes from ids)), (select xandra from ids),
  'Verification records who checked it');
select ok((select count(*) > 0 from public.audit_logs), 'Admins can read the audit log');

select * from finish();
rollback;
