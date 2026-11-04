-- Phase 7: the fast eligibility tally (eligibility_codes / verdict_of, used by search, dashboard
-- counts and new-match alerts) must agree with the explainable rules (eligibility_items) for every
-- combination of answers, including missing ones. Also: the helpers are inlinable, and fan-out is
-- set-based but still applies preferences.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Every answer value that matters at a boundary, plus "not answered", for each question.
create temp table answers as
select (row(null, f, null, y, g, false, i, fp, o, r, true, now(), now()))::public.student_profiles as sp
from unnest(array[null, 'engineering']::public.course_field[]) f
cross join unnest(array[null, 2]::smallint[]) y
cross join unnest(array[null, 2.00, 2.25]::numeric[]) g
cross join unnest(array[null, 'below_150k', '150k_250k', '250k_400k', '400k_800k', 'above_800k']::public.income_bracket[]) i
cross join unnest(array[null, 'yes', 'no', 'unsure']::public.tri_answer[]) fp
cross join unnest(array[null, true, false]) o
cross join unnest(array[null, 'ncr']::public.region[]) r;

-- Each requirement's code depends only on that requirement and its answer, so: every seeded
-- listing, each requirement alone (every income boundary), several with all of them (order), and none.
create function pg_temp.crit(im int, gm numeric, yl smallint[], fl public.course_field[], rg public.region[], ofw boolean, fps boolean)
returns public.scholarship_criteria language sql as $$ select (row(gen_random_uuid(), im, gm, yl, fl, rg, ofw, fps, now()))::public.scholarship_criteria $$;
create temp table crit as
select c from public.scholarship_criteria c
union all select null::public.scholarship_criteria
union all select pg_temp.crit(im, null, null, null, null, false, false) from unnest(array[150000, 250000, 300000, 400000]) im
union all select pg_temp.crit(null, 2.00, null, null, null, false, false)
union all select pg_temp.crit(null, null, '{2,3}', null, null, false, false)
union all select pg_temp.crit(null, null, null, '{engineering,education}', null, false, false)
union all select pg_temp.crit(null, null, null, null, '{ncr}', false, false)
union all select pg_temp.crit(null, null, null, null, null, true, false)
union all select pg_temp.crit(null, null, null, null, null, false, true)
union all select pg_temp.crit(im, 2.00, '{2,3}', '{engineering,education}', '{ncr}', ofw, fps)
  from unnest(array[150000, 300000]) im cross join (values (true, false), (false, true), (true, true)) f(ofw, fps);

-- Per requirement, in order: the fast code must equal the explainable status (0 met, 1 unknown, 2 not met).
create temp table compared as
select public.eligibility_codes(a.sp, k.c) as fast,
       coalesce((select array_agg(case e ->> 'status' when 'met' then 0 when 'unknown' then 1 else 2 end order by n)::smallint[]
                   from jsonb_array_elements(public.eligibility_items(a.sp, k.c)) with ordinality x(e, n)), '{}') as slow,
       public.verdict_of(public.eligibility_codes(a.sp, k.c), true) as fast_verdict,
       (public.eligibility_summary(public.eligibility_items(a.sp, k.c), true)).verdict as slow_verdict
from answers a cross join crit k;

select is((select count(*)::int from compared where fast is distinct from slow or fast_verdict is distinct from slow_verdict), 0,
  'The fast tally matches the explainable items requirement by requirement, and the verdict, for every combination');
select ok((select count(*) from compared) > 40000, 'Over 40,000 answer × criteria combinations checked');
select is(public.verdict_of('{}', false), 'none', 'No answers yet: "none", whatever the criteria');

-- Inlinable: no per-function search_path (see the migration's note on why that is safe here).
select is((select proconfig from pg_proc where oid = 'public.eligibility_codes(public.student_profiles, public.scholarship_criteria)'::regprocedure), null,
  'eligibility_codes has no search_path setting, so the planner can inline it');
select is((select proconfig from pg_proc where oid = 'public.scholarship_status(date, date)'::regprocedure), null, 'scholarship_status is inlinable');
select is((select prosecdef from pg_proc where oid = 'public.scholarship_status(date, date)'::regprocedure), false,
  'Inlinable helpers are security invoker');

-- Set-based fan-out still applies preferences and dedupes.
create function pg_temp.new_user(p_email text) returns uuid language plpgsql as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
  values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, now(), now());
  return uid;
end $$;
create temp table u as select pg_temp.new_user('fan1@perf.test') as a, pg_temp.new_user('fan2@perf.test') as b;
update public.notification_preferences set new_matches = false where user_id = (select b from u);
select is(public.notify_many(array[(select a from u), (select b from u), (select a from u)], 'new', 'T', 'B', null, 'perf:1'), 1,
  'notify_many: duplicates collapse and switched-off topics are skipped');
select is(public.notify_many(array[(select a from u)], 'new', 'T', 'B', null, 'perf:1'), 0, 'notify_many: dedupe keys hold');
select is(public.notify_many('{}', 'announce', 'T', 'B', null, 'perf:2'), 0, 'An empty audience notifies nobody');
select is(public.notify_many(null, 'announce', 'T', 'B', null, 'perf:3'), 0, 'A null audience notifies nobody (never "everyone")');

set local role authenticated;
select throws_ok($$ select public.notify_many(array[gen_random_uuid()], 'announce', 'x', 'x', null, 'x') $$, '42501', null,
  'Students can''t call notify_many');
reset role;

select * from finish();
rollback;
