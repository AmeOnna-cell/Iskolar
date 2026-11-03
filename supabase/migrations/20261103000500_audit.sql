-- 5. Append-only audit log of every coordinator and admin mutation.
--
-- * Triggers on staff-managed tables write one row per affected row (so batch operations log
--   one entry per item). Updates store only the columns that changed.
-- * log_audit() covers actions with no table write of their own, e.g. Auth Admin API calls
--   (ban, session revoke, hard delete) made with the service role on behalf of an admin.
-- * IP and user agent come from request headers the Next.js server client sends
--   (x-client-ip, x-client-user-agent), exposed by PostgREST as request.headers.
-- * Nobody can UPDATE, DELETE or TRUNCATE audit rows, including admins and the table owner.

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_role public.app_role,
  action text not null check (char_length(action) between 3 and 80),
  entity_type text not null check (char_length(entity_type) between 2 and 60),
  entity_id text,
  before jsonb,
  after jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);
comment on table public.audit_logs is 'Append-only. UPDATE, DELETE and TRUNCATE raise for every role.';

create function public.audit_logs_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'audit_logs is append-only' using errcode = '42501';
end $$;

create trigger audit_logs_no_update before update or delete on public.audit_logs
  for each row execute function public.audit_logs_immutable();
create trigger audit_logs_no_truncate before truncate on public.audit_logs
  for each statement execute function public.audit_logs_immutable();

-- Request context, safe when called outside PostgREST (headers absent or malformed).
create function public.request_header(p_name text) returns text
language plpgsql stable set search_path = '' as $$
begin
  return nullif(current_setting('request.headers', true), '')::jsonb ->> p_name;
exception when others then
  return null;
end $$;

create function public.request_ip() returns inet
language plpgsql stable set search_path = '' as $$
declare raw text := split_part(coalesce(public.request_header('x-client-ip'), public.request_header('x-forwarded-for'), ''), ',', 1);
begin
  return nullif(trim(raw), '')::inet;
exception when others then
  return null;
end $$;

create function public.write_audit(
  p_actor uuid, p_action text, p_entity_type text, p_entity_id text, p_before jsonb, p_after jsonb
) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, before, after, ip, user_agent)
  values (
    p_actor,
    (select role from public.profiles where id = p_actor),
    p_action, p_entity_type, p_entity_id, p_before, p_after,
    public.request_ip(),
    left(coalesce(public.request_header('x-client-user-agent'), public.request_header('user-agent')), 400)
  )
$$;
revoke all on function public.write_audit(uuid, text, text, text, jsonb, jsonb) from public, anon, authenticated;

-- Explicit audit entry. Staff may log as themselves; only trusted server code (service role)
-- may log on behalf of another actor (the admin whose request it is serving).
create function public.log_audit(
  p_action text, p_entity_type text, p_entity_id text,
  p_before jsonb default null, p_after jsonb default null, p_actor uuid default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_actor is not null and p_actor is distinct from auth.uid() and not public.is_privileged() then
    raise exception 'Only the server can log on behalf of another user' using errcode = '42501';
  end if;
  if not public.is_privileged() and not public.is_staff() then
    raise exception 'Only staff actions are audited' using errcode = '42501';
  end if;
  perform public.write_audit(coalesce(p_actor, auth.uid()), p_action, p_entity_type, p_entity_id, p_before, p_after);
end $$;

-- Keys whose value differs between two rows (noise columns excluded).
create function public.jsonb_changed_keys(a jsonb, b jsonb) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(k order by k), '{}')
  from (select jsonb_object_keys(coalesce(a, '{}') || coalesce(b, '{}')) k) keys
  where k not in ('updated_at', 'search_doc') and (a -> k) is distinct from (b -> k)
$$;

create function public.jsonb_pick(j jsonb, keys text[]) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(k, j -> k), '{}') from unnest(keys) k
$$;

create function public.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  old_j jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'search_doc' end;
  new_j jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'search_doc' end;
  row_j jsonb := coalesce(new_j, old_j);
  entity text := case tg_table_name
    when 'scholarships' then 'scholarship'
    when 'scholarship_criteria' then 'scholarship_criteria'
    when 'scholarship_benefits' then 'scholarship_benefit'
    when 'scholarship_documents' then 'scholarship_document'
    when 'scholarship_steps' then 'scholarship_step'
    when 'scholarship_notes' then 'scholarship_note'
    when 'providers' then 'provider'
    when 'announcements' then 'announcement'
    when 'inquiries' then 'inquiry'
    when 'inquiry_replies' then 'inquiry_reply'
    when 'profiles' then 'user'
    else tg_table_name end;
  changed text[];
  act text;
  b jsonb;
  a jsonb;
begin
  if coalesce(current_setting('iskolar.skip_audit', true), '') = 'on' then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    changed := public.jsonb_changed_keys(old_j, new_j);
    if tg_table_name = 'profiles' then
      -- Only privileged account changes; never the person's own name edits or PII.
      changed := array(select unnest(changed) intersect select unnest(array['role', 'status']));
    end if;
    if cardinality(changed) = 0 then
      return null;
    end if;
    b := public.jsonb_pick(old_j, changed);
    a := public.jsonb_pick(new_j, changed);
  elsif tg_op = 'INSERT' then
    if tg_table_name = 'profiles' then return null; end if;
    a := new_j;
  else
    if tg_table_name = 'profiles' then return null; end if;
    b := old_j;
  end if;

  act := entity || '.' || case tg_op when 'INSERT' then 'create' when 'DELETE' then 'delete' else 'update' end;

  if tg_table_name = 'scholarships' and tg_op = 'UPDATE' then
    if 'listing_status' = any (changed) then
      act := 'scholarship.' || case new.listing_status::text
        when 'published' then 'publish'
        when 'archived' then 'archive'
        when 'in_review' then 'submit_for_review'
        else case when old.listing_status = 'published' then 'unpublish' else 'return_to_draft' end
      end;
    elsif 'verification' = any (changed) or ('last_verified_at' = any (changed) and new.verification = 'verified') then
      -- Re-checking an already verified listing ("Last checked today") is a verification too.
      act := case when new.verification = 'verified' then 'scholarship.verify' else 'scholarship.unverify' end;
    elsif 'closes_on' = any (changed) or 'opens_on' = any (changed) then
      act := 'scholarship.deadline_change';
    end if;
  elsif tg_table_name = 'profiles' then
    act := case
      when 'role' = any (changed) then 'user.role_change'
      when new.status = 'deactivated' then 'user.deactivate'
      when new.status = 'deleted' then 'user.delete'
      else 'user.reactivate'
    end;
  end if;

  perform public.write_audit(
    auth.uid(), act, entity,
    coalesce(row_j ->> 'id', row_j ->> 'scholarship_id'),
    b, a
  );
  return null;
end $$;

-- Attach to every table staff can change. Student-owned tables are not audited.
do $$
declare t text;
begin
  foreach t in array array[
    'providers', 'scholarships', 'scholarship_criteria', 'scholarship_benefits', 'scholarship_documents',
    'scholarship_steps', 'scholarship_notes', 'announcements', 'inquiry_replies', 'profiles'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row()',
      t || '_audit', t
    );
  end loop;
end $$;

-- Inquiry status changes by staff (close / reopen) are staff actions too; the student's own insert is not.
create function public.audit_inquiry_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('iskolar.skip_audit', true), '') = 'on' then return null; end if;
  if public.is_staff() then
    perform public.write_audit(auth.uid(), 'inquiry.status_change', 'inquiry', new.id::text,
      jsonb_build_object('status', old.status), jsonb_build_object('status', new.status));
  end if;
  return null;
end $$;
create trigger inquiries_audit after update of status on public.inquiries
  for each row when (old.status is distinct from new.status)
  execute function public.audit_inquiry_status();
