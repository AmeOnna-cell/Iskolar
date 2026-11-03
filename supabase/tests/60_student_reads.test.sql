begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select is(
  public.listing_stats(),
  '{"total": 9, "open": 6, "upcoming": 2, "verified": 8, "by_type": {"government": 5, "local_government": 2, "private": 1}}'::jsonb,
  'Landing stats match the seed (the closed school award is left out of by_type)'
);
select throws_ok($$ select * from public.eligibility_counts(gen_random_uuid()) $$, '42501', null,
  'Visitors cannot read eligibility counts');
reset role;

insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
values ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@test.ph', now(), now());
insert into public.student_profiles (user_id, field, year_level, gwa, income_bracket, ofw, region, answered_family)
values ('22222222-2222-2222-2222-222222222222', 'science_math', 2, 1.85, '150k_250k', true, 'central_luzon', true);
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
-- Ana (not closed only): yes = TDP, DOST JLSS, OWWA, City = 4; maybe = TES; no = CMSP, Bayani, Health = 3.
select results_eq($$ select yes, maybe, no from public.eligibility_counts('22222222-2222-2222-2222-222222222222') $$,
  $$ values (4, 1, 3) $$, 'Eligibility counts for open and upcoming listings');
select throws_ok($$ select * from public.eligibility_counts(gen_random_uuid()) $$, '42501', null,
  'A student cannot read someone else''s counts');
reset role;

select * from finish();
rollback;
