-- Synthetic data for performance testing (Phase 7). LOCAL DATABASE ONLY.
--
--   docker exec -i supabase_db_Iskolar psql -U postgres -f - < scripts/synth.sql
--
-- Adds: 40 providers, 5,000 listings (with criteria and 15,000 documents), 2,000 students (1,600
-- with eligibility answers), ~20,000 applications, 50,000 notifications, ~100,000 audit entries.
-- Remove it with `npx supabase db reset` (audit entries are append-only by design).
\set ON_ERROR_STOP on
begin; -- all or nothing: a failure leaves no partial data and the triggers enabled
set local iskolar.synth = 'local';

do $$
begin
  -- Two guards against running this on the cloud project by mistake.
  if current_setting('iskolar.synth', true) is distinct from 'local' then
    raise exception 'synth.sql: run it with iskolar.synth = local (local database only)';
  end if;
  if exists (select 1 from auth.users where email not like '%@iskolar.test' and email not like '%.test' and email not like '%@notify.test'
             and email not like '%@office.ph' and email not like '%@test.ph' and email not like '%@example.com') then
    raise exception 'synth.sql: this database has real-looking accounts; refusing to load synthetic data';
  end if;
  if exists (select 1 from public.scholarships where slug like 'synth-%') then
    raise exception 'synth.sql: already loaded (npx supabase db reset to start over)';
  end if;
end $$;

select setseed(0.42);

-- Bulk loading: no alert fan-out (these triggers would e-mail/notify every synthetic student).
alter table public.scholarships disable trigger scholarships_notify_new_match_insert;
alter table public.scholarships disable trigger scholarships_notify_new_match_update;
alter table public.scholarship_documents disable trigger scholarship_documents_notify;

-- ---------- Providers ----------
insert into public.providers (name, short_name, abbr, color, type)
select 'Synth Provider ' || i || ' Foundation', 'Synth Provider ' || i, 'SP' || i,
       '#' || lpad(to_hex((i * 2654435761) % 16777215), 6, '0'),
       (array['government', 'local_government', 'private', 'school']::public.provider_type[])[1 + i % 4]
from generate_series(1, 40) i;

-- ---------- Listings ----------
insert into public.scholarships (slug, provider_id, name, summary, amount_text, amount_num, opens_on, closes_on,
                                 location_label, source_label, listing_status, verification, last_verified_at, published_at)
select 'synth-' || i,
       (select id from public.providers where abbr = 'SP' || (1 + i % 40)),
       (array['Merit', 'Grant', 'Assistance', 'Excellence', 'Bridge', 'Study', 'Tuition', 'Allowance'])[1 + i % 8] || ' '
         || (array['Engineering', 'Science', 'Education', 'Health', 'Business', 'Arts', 'Agriculture', 'Technology', 'Teachers', 'Nursing'])[1 + (i / 8) % 10]
         || ' Scholarship ' || i,
       'Synthetic listing ' || i || ' for performance tests: tuition support, a monthly allowance and book money for qualified students.',
       '₱' || to_char(5000 + (i % 40) * 1000, 'FM999,999') || ' a year', 5000 + (i % 40) * 1000,
       current_date - 90 + (i % 180) - 30 - (i % 60), current_date - 90 + (i % 180),
       (array['Nationwide', 'Metro Manila', 'Central Luzon', 'Cebu', 'Davao'])[1 + i % 5],
       'Synthetic source',
       (case when i % 10 < 8 then 'published' when i % 10 = 8 then 'draft' else 'archived' end)::public.listing_status,
       (case when i % 7 = 0 then 'unverified' else 'verified' end)::public.verification_status,
       case when i % 7 = 0 then null else now() - (i % 30) * interval '1 day' end,
       case when i % 10 < 8 then now() - (i % 90) * interval '1 day' end
from generate_series(1, 5000) i;

insert into public.scholarship_criteria (scholarship_id, fields, year_levels, gwa_max, income_max, regions, requires_four_ps, requires_ofw)
select s.id,
       case when n % 3 = 0 then array[(enum_range(null::public.course_field))[1 + n % 8], (enum_range(null::public.course_field))[1 + (n / 3) % 8]] end,
       case when n % 4 = 0 then array[1 + n % 4, 2 + n % 4]::smallint[] end,
       case when n % 2 = 0 then (1.75 + (n % 5) * 0.25)::numeric(3, 2) end,
       case when n % 3 = 1 then 250000 + (n % 4) * 150000 end,
       case when n % 5 = 0 then array[(enum_range(null::public.region))[1 + n % 17]] end,
       n % 11 = 0, n % 13 = 0
from (select id, substring(slug from 7)::int as n from public.scholarships where slug like 'synth-%') s
where s.n % 10 <> 9;

insert into public.scholarship_documents (scholarship_id, position, name, where_to_get)
select s.id, d - 1, (array['Certificate of Registration', 'Grades', 'Certificate of Indigency', 'ITR of parents'])[d], 'School registrar'
from public.scholarships s cross join generate_series(1, 3) d
where s.slug like 'synth-%';

-- ---------- Students ----------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at, email_confirmed_at)
select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'synth-' || i || '@synth.iskolar.test', jsonb_build_object('full_name', 'Synth Student ' || i),
       now() - (i % 400) * interval '1 day', now(), now()
from generate_series(1, 2000) i;

insert into public.student_profiles (user_id, field, year_level, gwa, income_bracket, four_ps, ofw, region, answered_family)
select p.id, (enum_range(null::public.course_field))[1 + n % 8], 1 + n % 4, (1.25 + (n % 8) * 0.25)::numeric(3, 2),
       (enum_range(null::public.income_bracket))[1 + n % 5], (enum_range(null::public.tri_answer))[1 + n % 3],
       n % 6 = 0, (enum_range(null::public.region))[1 + n % 17], true
from (select id, split_part(substring(email from 7), '@', 1)::int as n from public.profiles where email like 'synth-%@synth.iskolar.test') p
where p.n % 5 <> 0;

-- ~10 tracked listings per student (unique pairs).
insert into public.applications (student_id, scholarship_id, stage)
select distinct on (u.id, s.id) u.id, s.id,
       (array['saved', 'preparing', 'submitted']::public.application_stage[])[1 + (u.n + k) % 3]
from (select id, split_part(substring(email from 7), '@', 1)::int as n from public.profiles where email like 'synth-%@synth.iskolar.test') u
cross join generate_series(1, 10) k
join public.scholarships s on s.slug = 'synth-' || (1 + ((u.n * 37 + k * 491) % 4000)) and s.listing_status = 'published'
on conflict do nothing;

-- ---------- Notifications: 25 per student, ~60% read, already delivered ----------
insert into public.notifications (user_id, kind, title, body, link, dedupe_key, read_at, email_status, push_status, created_at, payload)
select u.id, (enum_range(null::public.notification_kind))[1 + k % 4],
       'Synthetic alert ' || k, 'Synthetic body for performance tests.', '/alerts',
       'synth:' || k, case when k % 5 < 3 then now() - k * interval '1 hour' end,
       'sent', 'skipped', now() - k * interval '6 hours', '{}'::jsonb
from (select id from public.profiles where email like 'synth-%@synth.iskolar.test') u
cross join generate_series(1, 25) k;

-- ---------- Audit log: top up to ~100,000 entries ----------
insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, before, after, created_at)
select null, 'admin', (array['scholarship.update', 'scholarship.publish', 'user.role_change', 'announcement.create'])[1 + i % 4],
       (array['scholarship', 'scholarship', 'user', 'announcement'])[1 + i % 4], gen_random_uuid()::text,
       jsonb_build_object('closes_on', '2026-11-01'), jsonb_build_object('closes_on', '2026-11-08'),
       now() - i * interval '5 minutes'
from generate_series(1, greatest(0, 100000 - (select count(*) from public.audit_logs))::int) i;

alter table public.scholarships enable trigger scholarships_notify_new_match_insert;
alter table public.scholarships enable trigger scholarships_notify_new_match_update;
alter table public.scholarship_documents enable trigger scholarship_documents_notify;

commit;
analyze;

select (select count(*) from public.scholarships) as scholarships,
       (select count(*) from public.scholarship_documents) as documents,
       (select count(*) from public.profiles where role = 'student') as students,
       (select count(*) from public.applications) as applications,
       (select count(*) from public.notifications) as notifications,
       (select count(*) from public.audit_logs) as audit_logs;
