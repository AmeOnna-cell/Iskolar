-- "Where to submit": optional columns, online needs a link, save_scholarship saves and clears them,
-- changes are audit-logged, sample listings are filled, visitors can read them.
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
       (select id from public.providers where abbr = 'CHED') as ched;
grant select on ids to authenticated;
create temp table box (k text primary key, v text);
grant all on box to authenticated;

-- ---------- Columns ----------
select col_is_null('public', 'scholarships', c, c || ' is optional')
from unnest(array['submission_method', 'submission_place', 'submission_address', 'submission_hours', 'submission_url', 'submission_note']) c;
select is((select count(*)::int from public.scholarships where is_sample and coalesce(submission_method::text, submission_note) is not null), 9,
  'All nine sample listings have where-to-submit details');
select is((select count(*)::int from public.scholarships s where is_sample and submission_method is distinct from 'online' and submission_url = s.source_url), 0,
  'No sample listing repeats its Source link as a "Website" row');
select is((select count(*)::int from public.scholarships where submission_method = 'online' and submission_url is null), 0,
  'Every online listing has a link');

-- ---------- Constraints ----------
select throws_ok($$ update public.scholarships set submission_method = 'online', submission_url = null where slug = 'tulong-dunong-program' $$,
  '23514', null, 'Online submission without a link is rejected');
select throws_ok($$ update public.scholarships set submission_url = 'javascript:alert(1)' where slug = 'tulong-dunong-program' $$,
  '23514', null, 'The link must be http(s)');
select lives_ok($$ update public.scholarships set submission_method = null, submission_place = null, submission_address = null,
  submission_hours = null, submission_url = null, submission_note = null where slug = 'presidents-academic-award' $$,
  'A listing with nothing set is valid');

-- ---------- save_scholarship ----------
select pg_temp.act_as((select carla from ids));
insert into box values ('sid', public.save_scholarship(jsonb_build_object(
  'slug', 'carla-submit', 'provider_id', (select ched from ids), 'name', 'Carla''s Submit Grant', 'amount_text', '₱5,000',
  'source_label', 'Office memo', 'submission_method', 'in_person', 'submission_place', 'Student Center',
  'submission_address', 'Room 101, Main Building', 'submission_hours', 'Mon–Fri, 8 AM–5 PM', 'submission_url', '',
  'submission_note', 'Bring photocopies.'
))::text);
reset role;
select results_eq(
  $$ select submission_method::text, submission_place, submission_address, submission_hours, submission_url, submission_note
       from public.scholarships where id = (select v::uuid from box where k = 'sid') $$,
  $$ values ('in_person', 'Student Center', 'Room 101, Main Building', 'Mon–Fri, 8 AM–5 PM', null::text, 'Bring photocopies.') $$,
  'save_scholarship saves the six fields (empty text becomes null)');

select pg_temp.act_as((select carla from ids));
select public.save_scholarship(jsonb_build_object(
  'id', (select v from box where k = 'sid'), 'slug', 'carla-submit', 'provider_id', (select ched from ids), 'name', 'Carla''s Submit Grant',
  'amount_text', '₱5,000', 'source_label', 'Office memo', 'submission_method', 'online', 'submission_url', 'https://example.org/apply'
));
reset role;
select results_eq(
  $$ select submission_method::text, submission_place, submission_url from public.scholarships where id = (select v::uuid from box where k = 'sid') $$,
  $$ values ('online', null::text, 'https://example.org/apply') $$,
  'An edit replaces the fields; left-out fields are cleared');
select is(
  (select after ->> 'submission_method' from public.audit_logs
    where entity_type = 'scholarship' and entity_id = (select v from box where k = 'sid') and action = 'scholarship.update'
    order by id desc limit 1),
  'online', 'Changes are audit-logged like other listing fields');

select pg_temp.act_as((select carla from ids));
select throws_ok($$ select public.save_scholarship(jsonb_build_object(
  'id', (select v from box where k = 'sid'), 'slug', 'carla-submit', 'provider_id', (select ched from ids), 'name', 'Carla''s Submit Grant',
  'amount_text', '₱5,000', 'source_label', 'Office memo', 'submission_method', 'online')) $$,
  '23514', null, 'save_scholarship can''t save online without a link');
select throws_ok($$ select public.fill_sample_submission() $$, '42501', null, 'Staff can''t run the sample fill');
reset role;

-- ---------- Visitors read them on published listings ----------
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select is((select submission_place from public.scholarships where slug = 'city-educational-assistance'), 'City Scholarship Office (sample)',
  'Visitors read where to submit on published listings');
reset role;

select * from finish();
rollback;
