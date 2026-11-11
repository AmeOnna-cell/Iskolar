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


insert into public.scholarships (slug, provider_id, name, amount_text, source_label, listing_status)
select fixture.slug, provider.id, fixture.name, 'Award pending', 'Test listing', 'published'
from (select id from public.providers order by id limit 1) provider
cross join (values ('test-similar-topic', 'Similarity test topic'), ('test-other-topic', 'Other test topic')) fixture(slug, name);

create temp table ids as
select pg_temp.new_user('similar-a@test.ph') as student_a,
       pg_temp.new_user('similar-b@test.ph') as student_b,
       pg_temp.new_user('similar-c@test.ph') as student_c,
       pg_temp.new_user('similar-coordinator@test.ph', 'coordinator') as coordinator,
       gen_random_uuid() as anchor, gen_random_uuid() as candidate,
       gen_random_uuid() as duplicate_student, gen_random_uuid() as other_topic,
       gen_random_uuid() as unrelated, gen_random_uuid() as closed,
       (select id from public.scholarships where slug = 'test-similar-topic') as tdp,
       (select id from public.scholarships where slug = 'test-other-topic') as tes;
grant select on ids to authenticated;
update public.scholarships set assigned_coordinator_id = (select coordinator from ids)
where id = (select tdp from ids);
insert into public.inquiries (id, student_id, scholarship_id, question, status)
select anchor, student_a, tdp, 'When is the TDP application deadline?', 'open'::public.inquiry_status from ids union all
select candidate, student_b, tdp, 'TDP deadline for the aplicaton?', 'open' from ids union all
select duplicate_student, student_b, tdp, 'When does the application deadline close?', 'open' from ids union all
select other_topic, student_c, tes, 'When is the TDP application deadline?', 'open' from ids union all
select unrelated, student_c, tdp, 'What is the household income cap?', 'open' from ids union all
select closed, student_c, tdp, 'When is the TDP application deadline?', 'closed' from ids;

select pg_temp.act_as((select coordinator from ids));
select is_empty(
  $$select * from public.inquiries where id = (select other_topic from ids)$$,
  'A coordinator cannot see inquiries for an unassigned scholarship'
);
select is_empty(
  $$select * from public.staff_inquiry_groups('open', 'Other test topic', 1, 10)$$,
  'The grouped queue omits unassigned scholarships'
);
select throws_ok(
  $$insert into public.inquiry_replies (inquiry_id, body)
    select other_topic, 'Out of scope reply' from ids$$,
  '42501', null, 'A coordinator cannot reply to an unassigned inquiry by ID'
);
select results_eq(
  $$with changed as (
    update public.inquiries set status = 'closed' where id = (select other_topic from ids) returning id
  ) select count(*)::integer from changed$$,
  $$values (0)$$,
  'A coordinator cannot change an unassigned inquiry status'
);
select results_eq(
  $$select inquiry_count from public.staff_inquiry_groups('open', 'Similarity test topic', 1, 10)$$,
  $$values (4)$$,
  'The staff table groups pending inquiries by scholarship and finds groups by scholarship name'
);
select results_eq(
  $$select inquiry_count from public.staff_inquiry_groups('open', 'household', 1, 10)
    where scholarship_id = (select tdp from ids)$$,
  $$values (1)$$,
  'Question search only counts matching inquiries in a group'
);
select results_eq(
  $$select i.student_id from public.similar_pending_inquiries((select anchor from ids)) s join public.inquiries i on i.id = s.id$$,
  $$select student_b from ids$$,
  'Suggestions match words and typos, group one inquiry per student, and exclude other topics and closed questions'
);
select throws_ok(
  $$select public.reply_to_pending_inquiries((select anchor from ids), array[(select candidate from ids), (select other_topic from ids)], 'Shared reply')$$,
  'P0001', null, 'A mixed-topic bulk reply fails atomically'
);
select throws_ok(
  $$select public.reply_to_pending_inquiries((select anchor from ids), array[(select candidate from ids), (select duplicate_student from ids)], 'Shared reply')$$,
  'P0001', null, 'A group cannot deliver twice to the same student'
);
select is((select count(*)::int from public.inquiry_replies where inquiry_id = (select anchor from ids)), 0, 'A rejected bulk reply leaves no message');
select is(public.reply_to_pending_inquiries((select anchor from ids), array[(select candidate from ids)], 'Shared reply'), 2, 'One action replies to both inquiries');
select is((select count(*)::int from public.inquiries where id in (select anchor from ids union all select candidate from ids) and status = 'answered'), 2, 'Both answered inquiries leave the pending queue');
select throws_ok(
  $$select public.reply_to_pending_inquiries((select anchor from ids), array[(select candidate from ids)], 'Duplicate reply')$$,
  'P0001', null, 'A stale retry cannot deliver again'
);

reset role;
select pg_temp.act_as((select student_a from ids));
select results_eq(
  $$select inquiry_id from public.inquiry_replies where body = 'Shared reply'$$,
  $$select anchor from ids$$,
  'Student A only sees their own private reply'
);
select is_empty($$select * from public.similar_pending_inquiries((select unrelated from ids))$$, 'Students cannot search other inquiries');
select throws_ok(
  $$select public.reply_to_pending_inquiries((select unrelated from ids), array[(select duplicate_student from ids)], 'Impersonated reply')$$,
  '42501', null, 'Students cannot bulk reply'
);

reset role;
select pg_temp.act_as((select student_b from ids));
select results_eq(
  $$select inquiry_id from public.inquiry_replies where body = 'Shared reply'$$,
  $$select candidate from ids$$,
  'Student B only sees their own private reply'
);

reset role;
select * from finish();
rollback;
