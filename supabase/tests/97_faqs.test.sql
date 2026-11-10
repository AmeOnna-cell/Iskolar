-- FAQs: search_faqs scoring (word order, missing words, typos, Filipino keywords, unrelated text),
-- approved-only results, RLS for anon/student/coordinator/admin, admin-only approval, audit log.
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
create function pg_temp.top(p text) returns text language sql as $$ select slug from public.search_faqs(p, 3) limit 1 $$;

create temp table ids as
select pg_temp.new_user('carla@office.ph', 'coordinator') as carla,
       pg_temp.new_user('ada@office.ph', 'admin') as ada,
       pg_temp.new_user('stu@test.ph') as stu,
       pg_temp.new_user('busy@test.ph') as busy;
grant select on ids to authenticated, anon;

-- ---------- Seeded FAQs ----------
select results_eq($$ select slug from public.faqs where status = 'approved' order by created_at $$,
  $$ values ('gwa'), ('indigency'), ('official'), ('accurate'), ('sample'), ('two'), ('reminders') $$,
  'The 7 Help page FAQs are approved rows that keep their #faq-… anchors, in their old order');

-- ---------- Scoring ----------
select is(pg_temp.top('where do I find my GWA'), 'gwa', 'A full question finds its FAQ');
select is((select score from public.search_faqs('gwa find where my') limit 1), (select score from public.search_faqs('where do I find my GWA') limit 1),
  'Word order doesn''t change the score');
select is(pg_temp.top('gwa'), 'gwa', 'Missing words don''t matter: one meaningful word is enough');
select is(pg_temp.top('how do notifications work'), 'reminders', 'Keywords count like the question');
select is(pg_temp.top('remind me'), 'reminders', 'English word forms match ("remind" ~ "reminders")');
select is(pg_temp.top('indigensy certificate'), 'indigency', 'A typo still matches (indigensy)');
select is(pg_temp.top('remnders'), 'reminders', 'A typo alone still matches (remnders)');
select is(pg_temp.top('scholarshp'), 'two', 'A typo alone still matches (scholarshp)');
select is(pg_temp.top('saan kukuha ng indigency'), 'indigency', 'Taglish: Filipino function words are ignored');
select is(pg_temp.top('paalala sa deadline'), 'reminders', 'Filipino keywords match without stemming');
select is_empty($$ select * from public.search_faqs('banana smoothie recipe') $$, 'Unrelated text returns nothing');
select is_empty($$ select * from public.search_faqs('school uniform') $$, 'A word only in one answer, or only close to a question word, stays under the minimum score');
select is_empty($$ select * from public.search_faqs('what is the') $$, 'Stopwords alone return nothing');
select is_empty($$ select * from public.search_faqs('') $$, 'An empty query returns nothing');
select is((select count(*)::int from public.search_faqs('listing', 1)), 1, 'p_limit caps the results');
select is((select count(*)::int from public.search_faqs('listing scholarship gwa reminders indigency')), 3, 'Up to 3 results by default');
select ok((select bool_and(score >= 0.5) from public.search_faqs('listing scholarship gwa reminders indigency', 10)), 'Every result meets the minimum score');
select is((select snippet from public.search_faqs('eligibility check official') limit 1),
  'No. It compares your answers with the requirements on file and shows which ones you meet. The provider always makes the final decision, and…',
  'Snippets drop link markup and cut at a word under 140 characters');

-- ---------- Coordinator: drafts only ----------
select pg_temp.act_as((select carla from ids));
insert into public.faqs (question, answer, keywords) values ('Do zebras need a crossing permit?', 'Only on weekdays.', '{zebra}');
select is((select status::text || ':' || slug from public.faqs where question like 'Do zebras%'), 'draft:do-zebras-need-a-crossing-permit',
  'A new FAQ is a draft with a slug made from the question');
select is((select created_by from public.faqs where question like 'Do zebras%'), (select carla from ids), 'created_by is the coordinator');
select throws_ok($$ insert into public.faqs (question, answer, status) values ('Approve myself please?', 'No.', 'approved') $$,
  '42501', null, 'A coordinator cannot add an approved FAQ');
select throws_ok($$ insert into public.faqs (question, answer, created_by) values ('Pretend author here?', 'No.', (select ada from ids)) $$,
  '42501', null, 'created_by cannot be set by the client');
update public.faqs set answer = 'Only on weekdays, with a stripe pass.', keywords = '{zebra,stripes}' where question like 'Do zebras%';
select is((select answer from public.faqs where question like 'Do zebras%'), 'Only on weekdays, with a stripe pass.', 'A coordinator edits a draft');
select throws_ok($$ update public.faqs set status = 'approved' where question like 'Do zebras%' $$, '42501', null, 'A coordinator cannot approve');
select throws_ok($$ update public.faqs set status = 'archived' where question like 'Do zebras%' $$, '42501', null, 'A coordinator cannot archive');
update public.faqs set answer = 'Changed by a coordinator' where slug = 'gwa';
select isnt((select answer from public.faqs where slug = 'gwa'), 'Changed by a coordinator', 'A coordinator cannot edit an approved FAQ');
select throws_ok($$ delete from public.faqs where slug = 'gwa' $$, '42501', null, 'Nobody deletes FAQs (archive instead)');
select is((select count(*)::int from public.faqs), 8, 'Staff see drafts too');
reset role;

-- Drafts and archived FAQs never appear in search.
select is_empty($$ select * from public.search_faqs('zebra crossing permit') $$, 'A draft never appears in search');

-- ---------- Admin: approve and archive ----------
select pg_temp.act_as((select ada from ids));
update public.faqs set status = 'approved' where question like 'Do zebras%';
select is((select approved_by from public.faqs where question like 'Do zebras%'), (select ada from ids), 'Approving stamps approved_by');
select isnt((select approved_at from public.faqs where question like 'Do zebras%'), null, 'Approving stamps approved_at');
update public.faqs set question = 'Do zebras need a road crossing permit?' where question like 'Do zebras%';
select is((select slug from public.faqs where question like 'Do zebras%'), 'do-zebras-need-a-crossing-permit', 'Edits keep the slug, so links keep working');
insert into public.faqs (question, answer, status) values ('Which zebra stripes are archived?', 'Old ones.', 'archived');
reset role;
select is(pg_temp.top('zebra crossing permit'), 'do-zebras-need-a-crossing-permit', 'Once approved, the FAQ appears in search');
select is((select count(*)::int from public.search_faqs('zebra stripes archived', 10) where slug like 'which-zebra%'), 0, 'An archived FAQ never appears in search');

-- ---------- Reads: anon and students see approved only ----------
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select is((select count(*)::int from public.faqs), 8, 'A visitor reads approved FAQs only');
select is(pg_temp.top('gwa'), 'gwa', 'A visitor can search');
select throws_ok($$ insert into public.faqs (question, answer) values ('Visitor question here?', 'x') $$, '42501', null, 'A visitor cannot add FAQs');
reset role;

select pg_temp.act_as((select stu from ids));
select is((select count(*)::int from public.faqs where status <> 'approved'), 0, 'A student never reads drafts or archived FAQs');
select throws_ok($$ insert into public.faqs (question, answer) values ('Student question here?', 'x') $$, '42501', null, 'A student cannot add FAQs');
update public.faqs set answer = 'Student edit' where slug = 'gwa';
reset role;
select isnt((select answer from public.faqs where slug = 'gwa'), 'Student edit', 'A student cannot edit FAQs');

-- ---------- Audit ----------
select results_eq($$ select action, actor_id from public.audit_logs where entity_type = 'faq' order by id $$,
  $$ values ('faq.create', (select carla from ids)), ('faq.update', (select carla from ids)),
            ('faq.approve', (select ada from ids)), ('faq.update', (select ada from ids)), ('faq.create', (select ada from ids)) $$,
  'Every FAQ change is audit-logged with its actor');

-- ---------- Topic: the chosen scholarship's FAQs come first ----------
select pg_temp.act_as((select ada from ids));
insert into public.faqs (question, answer, status, scholarship_id)
values ('Is a zebra permit needed for TES?', 'No.', 'approved', (select id from public.scholarships where slug = 'tertiary-education-subsidy'));
reset role;
select is(pg_temp.top('zebra crossing permit'), 'do-zebras-need-a-crossing-permit', 'Without a topic, the best text match is first');
select is((select slug from public.search_faqs('zebra crossing permit', 3, (select id from public.scholarships where slug = 'tertiary-education-subsidy')) limit 1),
  'is-a-zebra-permit-needed-for-tes', 'With a topic, that scholarship''s matching FAQ is first');
select is_empty($$ select * from public.search_faqs('banana smoothie', 3, (select id from public.scholarships where slug = 'tertiary-education-subsidy')) $$,
  'A topic never lets an unrelated FAQ through');

-- ---------- Rate limit: 60 searches a minute per user ----------
select pg_temp.act_as((select busy from ids));
do $$ begin for i in 1..60 loop perform public.search_faqs('gwa'); end loop; end $$;
select throws_ok($$ select public.search_faqs('gwa') $$, 'PT429', 'Too many searches. Wait a minute and try again.', 'The 61st search in a minute is refused');
select pg_temp.act_as((select stu from ids));
select is((select count(*)::int from public.search_faqs('gwa')), 1, 'Other people keep their own budget');
reset role;

select * from finish();
rollback;
