-- save_scholarship: one transaction, id-preserving lists (students' checklists survive edits),
-- quiet audit log for unchanged rows, coordinator limits. Plus staff_overview and session revocation.
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
select pg_temp.new_user('carla@office.ph', 'coordinator') as carla,
       pg_temp.new_user('dino@office.ph', 'coordinator') as dino,
       pg_temp.new_user('stu@test.ph') as stu,
       (select id from public.providers where abbr = 'CHED') as ched,
       (select id from public.scholarships where slug = 'tertiary-education-subsidy') as tes;
grant select on ids to authenticated;
create temp table box (k text primary key, v jsonb);
grant all on box to authenticated;

-- Carla creates a listing with two documents.
select pg_temp.act_as((select carla from ids));
insert into box values ('created', to_jsonb(public.save_scholarship(jsonb_build_object(
  'slug', 'carla-grant', 'provider_id', (select ched from ids), 'name', 'Carla''s Grant', 'amount_text', '₱10,000 a year',
  'amount_num', '10000', 'opens_on', '2026-11-01', 'closes_on', '2026-12-01', 'source_label', 'Office memo',
  'assigned_coordinator_id', (select dino from ids),
  'criteria', jsonb_build_object('gwa_max', '2.00', 'year_levels', jsonb_build_array(2, 3), 'fields', jsonb_build_array('engineering')),
  'documents', jsonb_build_array(jsonb_build_object('name', 'COR', 'where_to_get', 'Registrar'), jsonb_build_object('name', 'Grades', 'where_to_get', 'Registrar')),
  'steps', jsonb_build_array(jsonb_build_object('title', 'Apply online')),
  'benefits', jsonb_build_array(jsonb_build_object('text', '₱10,000 a year'))
))));
reset role;
create temp table sid as select (v #>> '{}')::uuid as id from box where k = 'created';
grant select on sid to authenticated;

select is((select assigned_coordinator_id from public.scholarships where id = (select id from sid)), (select carla from ids),
  'A coordinator''s new listing is assigned to them, whatever they send');
select is((select listing_status::text from public.scholarships where id = (select id from sid)), 'draft', 'New listings start as drafts');
select results_eq($$ select gwa_max, year_levels, fields::text[] from public.scholarship_criteria where scholarship_id = (select id from sid) $$,
  $$ values (2.00::numeric(3,2), '{2,3}'::smallint[], '{engineering}'::text[]) $$, 'Criteria are saved');
select is((select count(*)::int from public.scholarship_documents where scholarship_id = (select id from sid)), 2, 'Documents are saved in order');

-- Publish it (admin) and let a student tick both documents.
update public.scholarships set listing_status = 'published' where id = (select id from sid);
insert into public.applications (student_id, scholarship_id, stage) select stu, (select id from sid), 'preparing' from ids;
insert into public.application_documents (application_id, document_id)
select a.id, d.id from public.applications a join public.scholarship_documents d on d.scholarship_id = a.scholarship_id
where a.scholarship_id = (select id from sid);

insert into box
select 'docs', jsonb_agg(jsonb_build_object('id', id, 'name', name, 'where_to_get', where_to_get) order by position)
from public.scholarship_documents where scholarship_id = (select id from sid);
insert into box select 'audit_before', to_jsonb((select count(*) from public.audit_logs));

-- Save again with nothing changed: no audit noise.
select pg_temp.act_as((select carla from ids));
select lives_ok($$ select public.save_scholarship(jsonb_build_object(
  'id', (select id from sid), 'slug', 'carla-grant', 'provider_id', (select ched from ids), 'name', 'Carla''s Grant',
  'amount_text', '₱10,000 a year', 'amount_num', '10000', 'opens_on', '2026-11-01', 'closes_on', '2026-12-01', 'source_label', 'Office memo',
  'criteria', jsonb_build_object('gwa_max', '2.00', 'year_levels', jsonb_build_array(2, 3), 'fields', jsonb_build_array('engineering')),
  'documents', (select v from box where k = 'docs'),
  'steps', (select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'detail', detail)) from public.scholarship_steps where scholarship_id = (select id from sid)),
  'benefits', (select jsonb_agg(jsonb_build_object('id', id, 'text', text)) from public.scholarship_benefits where scholarship_id = (select id from sid))
)) $$, 'Saving without changes works');
reset role;
select is((select count(*) from public.audit_logs)::int, (select (v #>> '{}')::int from box where k = 'audit_before'),
  'Saving without changes writes no audit entries');

-- Rename the first document, drop the second, add a third; move the deadline.
select pg_temp.act_as((select carla from ids));
select lives_ok($$ select public.save_scholarship(jsonb_build_object(
  'id', (select id from sid), 'slug', 'carla-grant', 'provider_id', (select ched from ids), 'name', 'Carla''s Grant',
  'amount_text', '₱10,000 a year', 'opens_on', '2026-11-01', 'closes_on', '2026-12-08', 'source_label', 'Office memo',
  'documents', jsonb_build_array(
    jsonb_build_object('id', (select v -> 0 ->> 'id' from box where k = 'docs'), 'name', 'Certificate of Registration (COR)', 'where_to_get', 'Registrar'),
    jsonb_build_object('name', 'PSA birth certificate', 'where_to_get', 'PSA outlet'))
)) $$, 'Editing documents and the deadline works');
reset role;
select is(
  (select count(*)::int from public.application_documents ad join public.applications a on a.id = ad.application_id
    where a.scholarship_id = (select id from sid) and ad.document_id = (select (v -> 0 ->> 'id')::uuid from box where k = 'docs')),
  1, 'A renamed document keeps its id, so the student''s tick survives');
select is(
  (select count(*)::int from public.application_documents ad join public.applications a on a.id = ad.application_id where a.scholarship_id = (select id from sid)),
  1, 'Only the tick on the removed document is gone');
select results_eq($$ select name from public.scholarship_documents where scholarship_id = (select id from sid) order by position $$,
  $$ values ('Certificate of Registration (COR)'), ('PSA birth certificate') $$, 'New order and names are saved');
select is((select count(*)::int from public.deadline_changes where scholarship_id = (select id from sid) and new_closes_on = '2026-12-08'), 1,
  'The deadline change is recorded (it drives "deadline moved" alerts)');
select is((select count(*)::int from public.scholarship_criteria where scholarship_id = (select id from sid) and gwa_max is null and fields is null), 1,
  'Leaving out criteria clears them');

-- Coordinator limits
select pg_temp.act_as((select dino from ids));
select throws_ok($$ select public.save_scholarship(jsonb_build_object(
  'id', (select id from sid), 'slug', 'carla-grant', 'provider_id', (select ched from ids), 'name', 'Hijacked',
  'amount_text', '₱1', 'source_label', 'x')) $$, '42501', null, 'A coordinator cannot save a listing assigned to someone else');
select pg_temp.act_as((select carla from ids));
select throws_ok($$ select public.save_scholarship(jsonb_build_object(
  'id', (select id from sid), 'slug', 'carla-grant', 'provider_id', (select ched from ids), 'name', 'Carla''s Grant',
  'amount_text', '₱1', 'source_label', 'x', 'assigned_coordinator_id', (select dino from ids))) $$,
  '42501', 'Only an admin can assign coordinators', 'A coordinator cannot reassign through save_scholarship');
select ok((public.staff_overview() ->> 'mine')::int >= 1, 'staff_overview counts the coordinator''s own listings');

select pg_temp.act_as((select stu from ids));
select throws_ok($$ select public.save_scholarship('{}'::jsonb) $$, '42501', 'Only staff can edit listings', 'Students cannot save listings');
select throws_ok($$ select public.staff_overview() $$, '42501', null, 'Students cannot read the staff overview');
select throws_ok($$ select public.revoke_user_sessions(auth.uid()) $$, '42501', null, 'Only the server can revoke sessions');
reset role;

select * from finish();
rollback;
