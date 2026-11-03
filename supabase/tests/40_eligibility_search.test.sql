-- Explainable eligibility (met / not met / unknown, verdict yes | maybe | no | none) and server-side search.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.new_user(p_email text) returns uuid language plpgsql as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
  values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, now(), now());
  return uid;
end $$;

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

create temp table ids as select pg_temp.new_user('ana@test.ph') as ana, pg_temp.new_user('newbie@test.ph') as newbie;
grant select on ids to authenticated;

-- The prototype's sample student "Ana": BS Biology, 2nd year, GWA 1.85, ₱150k–250k, 4Ps not answered, OFW parent, Central Luzon.
insert into public.student_profiles (user_id, field, program, year_level, gwa, income_bracket, four_ps, ofw, region, answered_family)
select ana, 'science_math', 'BS Biology', 2, 1.85, '150k_250k', null, true, 'central_luzon', true from ids;

select pg_temp.act_as((select ana from ids));

select results_eq(
  $$ select s.slug, e.verdict from public.eligibility_for_scholarships((select ana from ids)) e
       join public.scholarships s on s.id = e.scholarship_id order by s.slug $$,
  $$ values ('bayani-foundation-engineering-grant', 'no'), ('ched-merit-scholarship', 'no'),
            ('city-educational-assistance', 'yes'), ('dost-sei-junior-level-science', 'yes'),
            ('owwa-ofw-dependents-scholarship', 'yes'), ('presidents-academic-award', 'no'),
            ('provincial-allied-health-grant', 'no'), ('tertiary-education-subsidy', 'maybe'),
            ('tulong-dunong-program', 'yes') $$,
  'Ana''s verdicts match the prototype');

select is(
  public.evaluate_eligibility((select ana from ids), (select id from public.scholarships where slug = 'tertiary-education-subsidy')),
  jsonb_build_object('scholarship_id', (select id from public.scholarships where slug = 'tertiary-education-subsidy'),
    'verdict', 'maybe', 'met', 0, 'unknown', 1, 'not_met', 0, 'total', 1,
    'items', jsonb_build_array(jsonb_build_object('kind', 'four_ps', 'required', true, 'have', null, 'status', 'unknown'))),
  'An unanswered 4Ps question is unknown, not "no"');

select is(
  (public.evaluate_eligibility((select ana from ids), (select id from public.scholarships where slug = 'presidents-academic-award')) -> 'items')
    @> '[{"kind":"gwa","status":"not_met","required":1.50,"have":1.85},{"kind":"year","status":"met"}]',
  true, 'Each requirement explains what is required and what Ana has');

-- "Not sure" is still an answer, and still unknown.
reset role;
update public.student_profiles set four_ps = 'unsure' where user_id = (select ana from ids);
select pg_temp.act_as((select ana from ids));
select is(
  public.evaluate_eligibility((select ana from ids), (select id from public.scholarships where slug = 'tertiary-education-subsidy')) #>> '{items,0,have}',
  'unsure', '"Not sure" is kept distinct from "not answered"');

-- Income bracket straddling the limit is unknown.
reset role;
insert into public.scholarships (slug, provider_id, name, amount_text, source_label, listing_status)
select 'straddle-test', provider_id, 'Income straddle test', '₱1', 'test', 'published' from public.scholarships where slug = 'tulong-dunong-program';
insert into public.scholarship_criteria (scholarship_id, income_max) select id, 200000 from public.scholarships where slug = 'straddle-test';
select pg_temp.act_as((select ana from ids));
select is(
  public.evaluate_eligibility((select ana from ids), (select id from public.scholarships where slug = 'straddle-test')) ->> 'verdict',
  'maybe', 'A ₱150k–250k household against a ₱200k limit might qualify');
reset role;
delete from public.scholarships where slug = 'straddle-test';

-- No answers yet.
select pg_temp.act_as((select newbie from ids));
select is(
  public.evaluate_eligibility((select newbie from ids), (select id from public.scholarships where slug = 'tulong-dunong-program')) ->> 'verdict',
  'none', 'A student who hasn''t answered gets "none", not a verdict');

-- ---------- Search ----------
select pg_temp.act_as((select ana from ids));

select results_eq($$ select slug from public.search_scholarships(p_sort => 'deadline') $$,
  $$ values ('city-educational-assistance'), ('tulong-dunong-program'), ('owwa-ofw-dependents-scholarship'),
            ('tertiary-education-subsidy'), ('bayani-foundation-engineering-grant'), ('provincial-allied-health-grant'),
            ('dost-sei-junior-level-science'), ('ched-merit-scholarship'), ('presidents-academic-award') $$,
  'Closing soonest: open by days left, then upcoming, then closed');
select results_eq($$ select slug from public.search_scholarships(p_q => 'ched') order by slug $$,
  $$ values ('ched-merit-scholarship'), ('tulong-dunong-program') $$, 'Search matches the provider (CHED)');
select results_eq($$ select slug from public.search_scholarships(p_q => 'dos') $$,
  $$ values ('dost-sei-junior-level-science') $$, 'Search matches word prefixes');
select lives_ok($$ select * from public.search_scholarships(p_q => $q$'); drop table public.profiles; --$q$) $$,
  'Hostile search input is just text');
select is((select count(*)::int from public.search_scholarships(p_eligible_only => true)), 5,
  '"Only ones I qualify for" keeps yes and maybe');
select is((select verdict from public.search_scholarships(p_sort => 'match') limit 1), 'yes', 'Best match puts "You qualify" first');
select is((select count(*)::int from public.search_scholarships(p_field => 'health_sciences')), 7,
  'A course filter keeps listings open to every course');
select is((select count(*)::int from public.search_scholarships(p_status => 'upcoming')), 2, 'Status filter');
select is((select count(*)::int from public.search_scholarships(p_type => 'private')), 1, 'Provider type filter');
select is((select count(*)::int from public.search_scholarships(p_region => 'ncr')), 8, 'Region filter keeps nationwide listings');
select results_eq($$ select count(*)::int, max(total_count)::int from public.search_scholarships(p_page => 2, p_page_size => 4) $$,
  $$ values (4, 9) $$, 'Pages return the page size and the full total');
select results_eq($$ select slug from public.search_scholarships(p_sort => 'amount') limit 2 $$,
  $$ values ('dost-sei-junior-level-science'), ('ched-merit-scholarship') $$, 'Highest amount first');
select is((select first_gap ->> 'kind' from public.search_scholarships() where slug = 'tertiary-education-subsidy'), 'four_ps',
  'Each result carries the first missing or failed requirement for the reason line');

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select is((select count(*)::int from public.search_scholarships() where verdict = 'none'), 9, 'Visitors get results with no verdicts');
reset role;

select * from finish();
rollback;
