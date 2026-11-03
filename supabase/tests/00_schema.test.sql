-- Schema-wide guarantees: RLS everywhere, the audit log is append-only, internal functions are locked.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select is_empty(
  $$ select tablename from pg_tables where schemaname = 'public' and not rowsecurity $$,
  'RLS is enabled on every table in public'
);

select is_empty(
  $$ select t.tablename from pg_tables t
      where t.schemaname = 'public' and t.tablename <> 'rate_limits'
        and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename) $$,
  'Every table except rate_limits has at least one policy (rate_limits is function-only)'
);

-- Append-only audit log, even for the table owner.
select public.write_audit(null, 'test.event', 'test', '1', null, '{"a":1}');
select throws_ok($$ update public.audit_logs set action = 'tampered' $$, '42501', 'audit_logs is append-only',
  'postgres cannot UPDATE audit rows');
select throws_ok($$ delete from public.audit_logs $$, '42501', 'audit_logs is append-only',
  'postgres cannot DELETE audit rows');
select throws_ok($$ truncate public.audit_logs $$, '42501', 'audit_logs is append-only',
  'postgres cannot TRUNCATE the audit log');

-- Rate limiter: service role only, and it counts.
select ok(not has_function_privilege('anon', 'public.check_rate_limit(text, integer, integer)', 'execute'),
  'anon cannot call check_rate_limit');
select ok(not has_function_privilege('authenticated', 'public.check_rate_limit(text, integer, integer)', 'execute'),
  'authenticated cannot call check_rate_limit');
set local role service_role;
select is(public.check_rate_limit('test:key', 2, 3600), true, 'rate limit: 1st call allowed');
select is(public.check_rate_limit('test:key', 2, 3600), true, 'rate limit: 2nd call allowed');
select is(public.check_rate_limit('test:key', 2, 3600), false, 'rate limit: 3rd call in the window refused');
reset role;

select ok(not has_function_privilege('authenticated', 'public.write_audit(uuid, text, text, text, jsonb, jsonb)', 'execute'),
  'write_audit is internal');
select ok(not has_function_privilege('authenticated', 'public.custom_access_token_hook(jsonb)', 'execute'),
  'the auth hook is not callable by users');
select ok(has_function_privilege('supabase_auth_admin', 'public.custom_access_token_hook(jsonb)', 'execute'),
  'Supabase Auth can call the hook');

select * from finish();
rollback;
