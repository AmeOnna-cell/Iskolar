-- Hardening migration: function privileges, pg_net location, foreign-key indexes.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Trigger functions (SECURITY DEFINER) can't be called directly by anyone.
select ok(
  not has_function_privilege(r, f, 'execute'),
  format('%s cannot execute %s', r, f)
)
from unnest(array['anon', 'authenticated']) r,
     unnest(array[
       'public.handle_new_user()', 'public.handle_user_email_change()', 'public.audit_row()',
       'public.audit_inquiry_status()', 'public.inquiry_replies_bookkeeping()',
       'public.profiles_default_preferences()', 'public.providers_refresh_search_doc()',
       'public.record_deadline_change()', 'public.application_documents_same_scholarship()'
     ]) f;

-- Visitors keep only the helpers an anon code path needs.
select ok(not has_function_privilege('anon', f, 'execute'), format('anon cannot execute %s', f))
from unnest(array['public.my_role()', 'public.is_admin()', 'public.is_student()', 'public.is_active_user()',
                  'public.is_privileged()', 'public.can_edit_scholarship(uuid)', 'public.assert_admin()',
                  'public.other_active_admin_exists(uuid)']) f;
select ok(has_function_privilege('anon', 'public.is_staff()', 'execute'), 'anon keeps is_staff() (published-listings policy)');
select ok(has_function_privilege('anon', 'public.my_student_profile()', 'execute'), 'anon keeps my_student_profile() (search)');
select ok(has_function_privilege('authenticated', f, 'execute'), format('authenticated keeps %s', f))
from unnest(array['public.my_role()', 'public.is_admin()', 'public.is_student()', 'public.is_active_user()',
                  'public.is_privileged()', 'public.can_edit_scholarship(uuid)']) f;

-- Visitors can still browse and search after the revokes.
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select is((select count(*)::int from public.scholarships), 9, 'Visitors still see published listings');
select is((select count(*)::int from public.scholarship_documents) > 0, true, 'Visitors still see listing documents');
select is((select count(*)::int from public.search_scholarships()), 9, 'Visitors can still search');
reset role;

-- pg_net lives in the extensions schema.
select is((select n.nspname::text from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pg_net'),
  'extensions', 'pg_net is installed in the extensions schema');
select is((select n.nspname::text from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pg_trgm'),
  'extensions', 'pg_trgm is installed in the extensions schema');

-- Every foreign key has an index whose first column is the FK column.
select is_empty(
  $$ select c.conrelid::regclass || '(' || a.attname || ')'
       from pg_constraint c
       join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.contype = 'f' and c.connamespace = 'public'::regnamespace and cardinality(c.conkey) = 1
        and not exists (
          select 1 from pg_index i where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1]
        ) $$,
  'Every single-column foreign key in public has a covering index'
);

select * from finish();
rollback;
