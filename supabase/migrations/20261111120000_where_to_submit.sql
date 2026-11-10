-- "Where to submit" for each scholarship: how (in person, online, by mail, through the student's
-- school), the office, its address and hours, an online link and a note. All optional, so existing
-- listings stay valid; students see "Confirm with the provider where to submit." when nothing is set.
-- Changes are audit-logged by the existing scholarships trigger (audit_row logs every changed column).

create type public.submission_method as enum ('in_person', 'online', 'mail', 'through_school');

alter table public.scholarships
  add column submission_method public.submission_method,
  add column submission_place text check (char_length(submission_place) <= 160),
  add column submission_address text check (char_length(submission_address) <= 300),
  add column submission_hours text check (char_length(submission_hours) <= 160),
  add column submission_url text check (char_length(submission_url) <= 500 and submission_url ~ '^https?://'),
  add column submission_note text check (char_length(submission_note) <= 600),
  -- Online submission needs somewhere to go.
  add constraint scholarships_submission_online_url check (submission_method is distinct from 'online' or submission_url is not null);

-- save_scholarship (migration 20261103160000) with the six new fields; otherwise unchanged.
create or replace function public.save_scholarship(p jsonb) returns uuid
language plpgsql set search_path = '' as $$
declare
  sid uuid := nullif(p ->> 'id', '')::uuid;
  pid uuid := nullif(p ->> 'provider_id', '')::uuid;
  kept uuid[];
  item jsonb;
  pos integer;
  list text;
  new_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Only staff can edit listings' using errcode = '42501';
  end if;

  -- Optional new provider, created in the same transaction.
  if pid is null and p ? 'new_provider' then
    insert into public.providers (name, short_name, abbr, color, type, website)
    values (
      trim(p #>> '{new_provider,name}'),
      nullif(trim(p #>> '{new_provider,short_name}'), ''),
      upper(trim(p #>> '{new_provider,abbr}')),
      coalesce(nullif(p #>> '{new_provider,color}', ''), '#334155'),
      (p #>> '{new_provider,type}')::public.provider_type,
      nullif(trim(p #>> '{new_provider,website}'), '')
    ) returning id into pid;
  end if;
  if pid is null then
    raise exception 'Choose a provider' using errcode = '23502';
  end if;

  if sid is null then
    insert into public.scholarships (
      slug, provider_id, name, summary, amount_text, amount_num, opens_on, closes_on, location_label,
      source_label, source_url, duration, renewal, obligations, assigned_coordinator_id,
      submission_method, submission_place, submission_address, submission_hours, submission_url, submission_note
    ) values (
      p ->> 'slug', pid, p ->> 'name', coalesce(p ->> 'summary', ''), p ->> 'amount_text',
      nullif(p ->> 'amount_num', '')::integer, nullif(p ->> 'opens_on', '')::date, nullif(p ->> 'closes_on', '')::date,
      nullif(p ->> 'location_label', ''), p ->> 'source_label', nullif(p ->> 'source_url', ''),
      nullif(p ->> 'duration', ''), nullif(p ->> 'renewal', ''), nullif(p ->> 'obligations', ''),
      nullif(p ->> 'assigned_coordinator_id', '')::uuid,
      nullif(p ->> 'submission_method', '')::public.submission_method, nullif(p ->> 'submission_place', ''),
      nullif(p ->> 'submission_address', ''), nullif(p ->> 'submission_hours', ''), nullif(p ->> 'submission_url', ''),
      nullif(p ->> 'submission_note', '')
    ) returning id into sid;
  else
    update public.scholarships s set
      slug = p ->> 'slug',
      provider_id = pid,
      name = p ->> 'name',
      summary = coalesce(p ->> 'summary', ''),
      amount_text = p ->> 'amount_text',
      amount_num = nullif(p ->> 'amount_num', '')::integer,
      opens_on = nullif(p ->> 'opens_on', '')::date,
      closes_on = nullif(p ->> 'closes_on', '')::date,
      location_label = nullif(p ->> 'location_label', ''),
      source_label = p ->> 'source_label',
      source_url = nullif(p ->> 'source_url', ''),
      duration = nullif(p ->> 'duration', ''),
      renewal = nullif(p ->> 'renewal', ''),
      obligations = nullif(p ->> 'obligations', ''),
      submission_method = nullif(p ->> 'submission_method', '')::public.submission_method,
      submission_place = nullif(p ->> 'submission_place', ''),
      submission_address = nullif(p ->> 'submission_address', ''),
      submission_hours = nullif(p ->> 'submission_hours', ''),
      submission_url = nullif(p ->> 'submission_url', ''),
      submission_note = nullif(p ->> 'submission_note', ''),
      -- Only admins send this key; for coordinators the guard rejects any change.
      assigned_coordinator_id = case when p ? 'assigned_coordinator_id'
                                     then nullif(p ->> 'assigned_coordinator_id', '')::uuid
                                     else s.assigned_coordinator_id end
    where s.id = sid;
    if not found then
      raise exception 'Listing not found, or it isn''t assigned to you' using errcode = '42501';
    end if;
  end if;

  -- Criteria (one row; absent keys = no such criterion)
  insert into public.scholarship_criteria as c (scholarship_id, income_max, gwa_max, year_levels, fields, regions, requires_ofw, requires_four_ps)
  values (
    sid,
    nullif(p #>> '{criteria,income_max}', '')::integer,
    nullif(p #>> '{criteria,gwa_max}', '')::numeric,
    (select nullif(array_agg(v::smallint), '{}') from jsonb_array_elements_text(coalesce(p #> '{criteria,year_levels}', '[]')) v),
    (select nullif(array_agg(v::public.course_field), '{}') from jsonb_array_elements_text(coalesce(p #> '{criteria,fields}', '[]')) v),
    (select nullif(array_agg(v::public.region), '{}') from jsonb_array_elements_text(coalesce(p #> '{criteria,regions}', '[]')) v),
    coalesce((p #>> '{criteria,requires_ofw}')::boolean, false),
    coalesce((p #>> '{criteria,requires_four_ps}')::boolean, false)
  )
  on conflict (scholarship_id) do update set
    income_max = excluded.income_max, gwa_max = excluded.gwa_max, year_levels = excluded.year_levels,
    fields = excluded.fields, regions = excluded.regions,
    requires_ofw = excluded.requires_ofw, requires_four_ps = excluded.requires_four_ps
  where (c.income_max, c.gwa_max, c.year_levels, c.fields, c.regions, c.requires_ofw, c.requires_four_ps)
        is distinct from
        (excluded.income_max, excluded.gwa_max, excluded.year_levels, excluded.fields, excluded.regions, excluded.requires_ofw, excluded.requires_four_ps);

  -- Lists, matched by id. Positions are deferrable-unique, so reordering in one go is fine.
  foreach list in array array['benefits', 'documents', 'steps', 'notes'] loop
    kept := '{}';
    pos := 0;
    for item in select value from jsonb_array_elements(coalesce(p -> list, '[]')) loop
      if list = 'benefits' then
        if nullif(item ->> 'id', '') is not null then
          update public.scholarship_benefits set position = pos, text = item ->> 'text'
           where id = (item ->> 'id')::uuid and scholarship_id = sid
             and (position, text) is distinct from (pos, item ->> 'text');
          kept := kept || (item ->> 'id')::uuid;
        else
          insert into public.scholarship_benefits (scholarship_id, position, text) values (sid, pos, item ->> 'text')
          returning id into new_id;
          kept := kept || new_id;
        end if;
      elsif list = 'documents' then
        if nullif(item ->> 'id', '') is not null then
          update public.scholarship_documents set position = pos, name = item ->> 'name', where_to_get = coalesce(item ->> 'where_to_get', '')
           where id = (item ->> 'id')::uuid and scholarship_id = sid
             and (position, name, where_to_get) is distinct from (pos, item ->> 'name', coalesce(item ->> 'where_to_get', ''));
          kept := kept || (item ->> 'id')::uuid;
        else
          insert into public.scholarship_documents (scholarship_id, position, name, where_to_get)
          values (sid, pos, item ->> 'name', coalesce(item ->> 'where_to_get', ''))
          returning id into new_id;
          kept := kept || new_id;
        end if;
      elsif list = 'steps' then
        if nullif(item ->> 'id', '') is not null then
          update public.scholarship_steps set position = pos, title = item ->> 'title', detail = coalesce(item ->> 'detail', '')
           where id = (item ->> 'id')::uuid and scholarship_id = sid
             and (position, title, detail) is distinct from (pos, item ->> 'title', coalesce(item ->> 'detail', ''));
          kept := kept || (item ->> 'id')::uuid;
        else
          insert into public.scholarship_steps (scholarship_id, position, title, detail)
          values (sid, pos, item ->> 'title', coalesce(item ->> 'detail', ''))
          returning id into new_id;
          kept := kept || new_id;
        end if;
      else
        if nullif(item ->> 'id', '') is not null then
          update public.scholarship_notes set position = pos, text = item ->> 'text'
           where id = (item ->> 'id')::uuid and scholarship_id = sid
             and (position, text) is distinct from (pos, item ->> 'text');
          kept := kept || (item ->> 'id')::uuid;
        else
          insert into public.scholarship_notes (scholarship_id, position, text) values (sid, pos, item ->> 'text')
          returning id into new_id;
          kept := kept || new_id;
        end if;
      end if;
      pos := pos + 1;
    end loop;
    execute format('delete from public.%I where scholarship_id = $1 and not (id = any ($2))', 'scholarship_' || list)
      using sid, kept;
  end loop;

  return sid;
end $$;

-- ---------- Sample values for the nine seeded (sample) listings ----------
-- One place for the data: this migration runs it for databases that already hold the sample
-- listings (the cloud), and supabase/seed.sql runs it again after seeding (local resets).
-- Only rows marked is_sample are touched. Not audited (it's seed data, not a staff action).
create function public.fill_sample_submission() returns void
language plpgsql set search_path = '' as $$
begin
  perform set_config('iskolar.skip_audit', 'on', true);
  update public.scholarships s set
    submission_method = v.method::public.submission_method,
    submission_place = v.place,
    submission_address = v.address,
    submission_hours = v.hours,
    submission_url = v.url,
    submission_note = v.note
  from (values
    -- Notes are about handing the application in; they don't repeat the How to apply steps.
    -- Links are where to submit, never just the agency homepage (that's already the Source).
    ('tulong-dunong-program', 'through_school', 'scholarship coordinator''s office', null, null, null,
     'Ask for your school''s own cut-off date. It''s usually earlier than CHED''s.'),
    ('tertiary-education-subsidy', 'through_school', 'scholarship or registrar''s office', null, null, null,
     'Some schools also want a printed copy of your application. Ask your registrar.'),
    -- No method yet: CHED posts where to apply when the period opens.
    ('ched-merit-scholarship', null, null, null, null, null,
     'CHED regional offices post where and how to apply when the period opens. Check your regional office''s page.'),
    ('dost-sei-junior-level-science', 'online', null, null, null, 'https://www.sei.dost.gov.ph',
     'Use the email you registered with, and keep the confirmation email after you submit.'),
    ('owwa-ofw-dependents-scholarship', 'in_person', 'OWWA Regional Welfare Office for your region', null, 'Monday to Friday, 8:00 AM to 5:00 PM', null,
     'Go early: regional offices get busy near the deadline.'),
    ('city-educational-assistance', 'in_person', 'City Scholarship Office (sample)', 'Ground floor, City Hall, Sample City (sample address)', 'Monday to Friday, 8:00 AM to 5:00 PM',
     null, 'Bring the originals and one photocopy of each document.'),
    ('provincial-allied-health-grant', 'in_person', 'Provincial Scholarship Office (sample)', 'Provincial Capitol compound, Sample Province (sample address)', 'Monday to Friday, 8:00 AM to 4:00 PM',
     null, 'You can also hand it in at your school''s scholarship office.'),
    -- example.org: a reserved example address, since this sample sponsor has no real form.
    ('bayani-foundation-engineering-grant', 'online', null, null, null, 'https://example.org/bayani-foundation-apply',
     'Sample link: this example sponsor has no real application form.'),
    ('presidents-academic-award', 'through_school', 'Office of Student Affairs, Sample State University (sample)', 'Student Center, 2nd floor (sample address)', 'Monday to Friday, 8:00 AM to 5:00 PM',
     null, 'Bring your nomination letter and school ID.')
  ) as v (slug, method, place, address, hours, url, note)
  where s.slug = v.slug and s.is_sample;
  perform set_config('iskolar.skip_audit', 'off', true);
end $$;
revoke execute on function public.fill_sample_submission() from public, anon, authenticated;

select public.fill_sample_submission();
