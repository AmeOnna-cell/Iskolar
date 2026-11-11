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


create temp table ids as
select pg_temp.new_user('followup-owner@test.ph') as owner_id,
       pg_temp.new_user('followup-other@test.ph') as other_id,
       pg_temp.new_user('followup-staff@test.ph', 'admin') as staff_id,
       gen_random_uuid() as inquiry_id;
grant select on ids to authenticated;
insert into public.inquiries(id, student_id, question, status)
select inquiry_id, owner_id, 'When does this program close?', 'answered' from ids;

select pg_temp.act_as((select owner_id from ids));
select lives_ok($q$insert into public.inquiry_replies(inquiry_id, body)
  select inquiry_id, 'Can you confirm the date?' from ids$q$, 'Owner can follow up');
select is((select status::text from public.inquiries where id = (select inquiry_id from ids)), 'open', 'Follow-up reopens inquiry');
select is((select author_id from public.inquiry_replies where inquiry_id = (select inquiry_id from ids)), (select owner_id from ids), 'Author is the authenticated student');

reset role;
select pg_temp.act_as((select other_id from ids));
select throws_ok($q$insert into public.inquiry_replies(inquiry_id, body)
  select inquiry_id, 'Access another inquiry' from ids$q$, '42501', null, 'Another student cannot reply');
select is((select count(*)::int from public.inquiry_replies where inquiry_id = (select inquiry_id from ids)), 0, 'Other student cannot read the thread');

reset role;
select pg_temp.act_as((select staff_id from ids));
select lives_ok($q$insert into public.inquiry_replies(inquiry_id, body)
  select inquiry_id, 'The listing contains the deadline.' from ids$q$, 'Staff can reply');
select is((select status::text from public.inquiries where id = (select inquiry_id from ids)), 'answered', 'Staff reply marks inquiry answered');
select lives_ok($q$insert into public.inquiry_replies(inquiry_id, body)
  select inquiry_id, 'Additional clarification' from ids$q$, 'Staff can reply again to an answered inquiry');
select is((select status::text from public.inquiries where id = (select inquiry_id from ids)), 'answered', 'A staff clarification keeps the inquiry answered');

reset role;
select pg_temp.act_as((select owner_id from ids));
select lives_ok($q$insert into public.inquiry_replies(inquiry_id, body)
  select inquiry_id, 'I have another question.' from ids$q$, 'The student can follow up after an answer');
select is((select status::text from public.inquiries where id = (select inquiry_id from ids)), 'open', 'A follow-up returns an answered inquiry to Waiting');

reset role;
select pg_temp.act_as((select staff_id from ids));
select lives_ok($q$insert into public.inquiry_replies(inquiry_id, body)
  select inquiry_id, 'Here is the next answer.' from ids$q$, 'Staff can reply again after a student follows up');
update public.inquiries set status = 'closed' where id = (select inquiry_id from ids);
select throws_ok($q$insert into public.inquiry_replies(inquiry_id, body)
  select inquiry_id, 'Staff message after closing' from ids$q$, 'P0001', null, 'Staff must reopen a closed inquiry before replying');

reset role;
select pg_temp.act_as((select owner_id from ids));
select throws_ok($q$insert into public.inquiry_replies(inquiry_id, body)
  select inquiry_id, 'Message after closing' from ids$q$, '42501', null, 'Closed inquiries reject student replies');
select is((select status::text from public.inquiries where id = (select inquiry_id from ids)), 'closed', 'Failed reply preserves closed state');

reset role;
select * from finish();
rollback;
