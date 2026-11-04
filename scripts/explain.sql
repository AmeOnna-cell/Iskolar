-- Phase 7: EXPLAIN ANALYZE of the main queries, as the app runs them (right role, RLS on).
-- Run after scripts/synth.sql, as a superuser (auto_explain prints plans inside functions):
--   docker exec -i supabase_db_Iskolar psql -U supabase_admin -d postgres -f - < scripts/explain.sql
-- Everything that writes runs inside a transaction that is rolled back.
\set ON_ERROR_STOP on
\pset pager off
\timing on

select id as student from public.profiles p
 where email like 'synth-%' and exists (select 1 from public.student_profiles sp where sp.user_id = p.id)
   and exists (select 1 from public.applications a where a.student_id = p.id) order by email limit 1 \gset
select id as admin from public.profiles where role = 'admin' and status = 'active' order by created_at limit 1 \gset
\echo student=:student admin=:admin

load 'auto_explain';
-- Plans for anything slower than 20 ms, including statements inside functions and triggers.
set auto_explain.log_min_duration = 20;
set auto_explain.log_analyze = on;
set auto_explain.log_buffers = on;
set auto_explain.log_timing = on;
set auto_explain.log_nested_statements = on;
set auto_explain.log_level = notice;
set client_min_messages = notice;

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', false);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
end $$;

\echo '=== 1. Explore, student, default sort (search_scholarships)'
select pg_temp.as_user(:'student');
select count(*) from public.search_scholarships(null, null, null, null, null, null, false, 'deadline', 1, 20);
\echo '=== 2. Explore, student, text search "engineering"'
select count(*) from public.search_scholarships('engineering', null, null, null, null, null, false, 'deadline', 1, 20);
\echo '=== 3. Dashboard: only ones I qualify for (mine)'
select count(*) from public.search_scholarships(null, null, null, null, null, null, true, 'deadline', 1, 20);
\echo '=== 4. Dashboard: eligibility_counts'
select * from public.eligibility_counts(:'student');
reset role;

\echo '=== 5. Explore, visitor (anon), default sort'
set role anon;
select count(*) from public.search_scholarships(null, null, null, null, null, null, false, 'deadline', 1, 20);
\echo '=== 6. Landing: listing_stats'
select public.listing_stats() is not null;
reset role;

\echo '=== 7. Alerts page: newest 25 + total, and the unread badge'
select pg_temp.as_user(:'student');
explain (analyze, buffers, costs off)
select id, kind, title, body, link, read_at, created_at from public.notifications order by created_at desc, id desc limit 25;
explain (analyze, buffers, costs off) select count(*) from public.notifications;
explain (analyze, buffers, costs off) select count(*) from public.notifications where read_at is null;
\echo '=== 8. My applications'
explain (analyze, buffers, costs off)
select a.id, a.stage, s.name, s.closes_on from public.applications a join public.scholarships s on s.id = a.scholarship_id
 where a.student_id = :'student' order by s.closes_on nulls last;
reset role;

\echo '=== 9. Staff listings: page 1 by deadline, total, and a name search'
select pg_temp.as_user(:'admin');
explain (analyze, buffers, costs off)
select s.id, s.name, s.listing_status, s.closes_on, p.name from public.scholarships s join public.providers p on p.id = s.provider_id
 order by s.closes_on asc nulls last, s.id limit 25;
explain (analyze, buffers, costs off) select count(*) from public.scholarships;
explain (analyze, buffers, costs off)
select s.id, s.name from public.scholarships s where s.name ilike '%nursing%' order by s.closes_on asc nulls last, s.id limit 25;
explain (analyze, buffers, costs off) select count(*) from public.scholarships s where s.name ilike '%nursing%';
\echo '=== 10. Users: page 1 newest, total, search'
explain (analyze, buffers, costs off)
select id, full_name, email, role, status, created_at from public.profiles order by created_at desc nulls last, id limit 25;
explain (analyze, buffers, costs off) select count(*) from public.profiles;
explain (analyze, buffers, costs off)
select id, email from public.profiles where full_name ilike '%student 19%' or email ilike '%student 19%' order by created_at desc, id limit 25;
\echo '=== 11. Audit log: newest 26, deep keyset page, filter by action'
explain (analyze, buffers, costs off)
select id, action, created_at from public.audit_logs order by created_at desc, id desc limit 26;
explain (analyze, buffers, costs off)
select id, action, created_at from public.audit_logs
 where created_at <= now() - interval '200 days'   -- the bound listAudit adds before its OR
   and (created_at < now() - interval '200 days' or (created_at = now() - interval '200 days' and id < 50000))
 order by created_at desc, id desc limit 26;
explain (analyze, buffers, costs off)
select id, action, created_at from public.audit_logs where action = 'user.role_change' order by created_at desc, id desc limit 26;
\echo '=== 12. staff_overview'
select public.staff_overview() is not null;
reset role;

\echo '=== 13. Jobs (rolled back): reminders, dispatcher claim, publish fan-out, announcement fan-out'
begin;
select public.enqueue_deadline_reminders() as reminders;
select count(*) as claimed from public.claim_notifications(100);
update public.scholarships set listing_status = 'published' where slug = 'synth-8';  -- a draft → evaluates every student
insert into public.announcements (title, body, posted_as) values ('Synth fan-out', 'Body', 'Synth office');
rollback;
