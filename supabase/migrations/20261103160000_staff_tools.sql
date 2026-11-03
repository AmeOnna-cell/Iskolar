-- Phase 5: staff and admin tools.
--
-- save_scholarship(p): create or update a listing and all its parts in ONE transaction.
--   * Security invoker: RLS and guard_scholarship_workflow decide what this caller may change
--     (coordinators: their assigned listings, never status/verification/assignment).
--   * List items (benefits, documents, steps, notes) are matched by id: existing rows are updated
--     in place, new ones inserted, removed ones deleted. Never delete-and-recreate: documents are
--     referenced by students' checklists (application_documents), and recreating them would wipe
--     every student's ticked documents. Unchanged rows produce no audit entry.

create function public.save_scholarship(p jsonb) returns uuid
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
      source_label, source_url, duration, renewal, obligations, assigned_coordinator_id
    ) values (
      p ->> 'slug', pid, p ->> 'name', coalesce(p ->> 'summary', ''), p ->> 'amount_text',
      nullif(p ->> 'amount_num', '')::integer, nullif(p ->> 'opens_on', '')::date, nullif(p ->> 'closes_on', '')::date,
      nullif(p ->> 'location_label', ''), p ->> 'source_label', nullif(p ->> 'source_url', ''),
      nullif(p ->> 'duration', ''), nullif(p ->> 'renewal', ''), nullif(p ->> 'obligations', ''),
      nullif(p ->> 'assigned_coordinator_id', '')::uuid
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
revoke execute on function public.save_scholarship(jsonb) from public, anon;
grant execute on function public.save_scholarship(jsonb) to authenticated;

-- Staff overview numbers (one round trip).
create function public.staff_overview() returns jsonb
language plpgsql stable set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can see this' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'listings', count(*),
      'published', count(*) filter (where listing_status = 'published'),
      'open', count(*) filter (where listing_status = 'published' and public.scholarship_status(opens_on, closes_on) = 'open'),
      'in_review', count(*) filter (where listing_status = 'in_review'),
      'unverified', count(*) filter (where listing_status in ('published', 'in_review') and verification = 'unverified'),
      'closing_7', count(*) filter (where listing_status = 'published' and public.scholarship_status(opens_on, closes_on) = 'open'
                                      and closes_on - public.today_ph() <= 7),
      'mine', count(*) filter (where assigned_coordinator_id = auth.uid()),
      'open_inquiries', (select count(*) from public.inquiries where status = 'open')
    )
    from public.scholarships
  );
end $$;
revoke execute on function public.staff_overview() from public, anon;
grant execute on function public.staff_overview() to authenticated;

-- Revoke every session of a user right away (deactivate / delete / role change). Service role
-- only: called by server code after requireRole('admin'). The Auth ban stops new sign-ins; this
-- ends existing refresh tokens, and RLS already ignores the still-valid access token.
create function public.revoke_user_sessions(p_user uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from auth.sessions where user_id = p_user;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;
