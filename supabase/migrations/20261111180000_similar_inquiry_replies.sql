create index if not exists inquiries_pending_scholarship_idx
on public.inquiries (scholarship_id, id) where status = 'open';

create or replace function public.similar_pending_inquiries(p_inquiry uuid)
returns table (id uuid, question text, updated_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  with anchor as (
    select i.id, i.scholarship_id, i.student_id,
           coalesce(latest.body, i.question) as question
    from public.inquiries i
    left join lateral (
      select r.body from public.inquiry_replies r
      where r.inquiry_id = i.id and r.author_id = i.student_id
      order by r.created_at desc, r.id desc limit 1
    ) latest on true
    where i.id = p_inquiry and i.status = 'open' and i.student_id is not null and (select public.is_staff())
  ), terms as (
    select a.*, tsvector_to_array(to_tsvector('english', left(a.question, 1000))) as words
    from anchor a
  ), ranked as (
    select i.id, i.student_id, i.updated_at, message.question, cardinality(a.words) as anchor_words,
           extensions.similarity(lower(left(a.question, 1000)), lower(left(message.question, 1000))) as similarity,
           (select count(*) from unnest(a.words) w
             where w = any(tsvector_to_array(to_tsvector('english', left(message.question, 1000))))) as overlap
    from terms a
    join public.inquiries i on i.scholarship_id is not distinct from a.scholarship_id
      and i.status = 'open' and i.student_id <> a.student_id
    left join lateral (
      select r.body from public.inquiry_replies r
      where r.inquiry_id = i.id and r.author_id = i.student_id
      order by r.created_at desc, r.id desc limit 1
    ) latest on true
    cross join lateral (select coalesce(latest.body, i.question) as question) message
  ), best_per_student as (
    select distinct on (r.student_id) r.id, r.question, r.updated_at,
           r.similarity + r.overlap::real / greatest(r.anchor_words, 1) as score
    from ranked r
    where r.anchor_words > 0 and (r.overlap >= 2 or r.similarity >= 0.42)
    order by r.student_id, score desc, r.updated_at desc, r.id
  )
  select r.id, r.question, r.updated_at
  from best_per_student r
  order by r.score desc, r.updated_at desc, r.id
  limit 8;
$$;

create or replace function public.reply_to_pending_inquiries(p_inquiry uuid, p_additional uuid[], p_body text)
returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  targets uuid[];
  target_count integer;
  matched integer;
  topic uuid;
  body text := btrim(p_body);
begin
  if not public.is_staff() then
    raise exception 'Staff access required' using errcode = '42501';
  end if;
  if p_inquiry is null or p_additional is null or cardinality(p_additional) not between 1 and 8
    or array_position(p_additional, null) is not null
    or body is null or char_length(body) not between 1 and 4000 then
    raise exception 'Invalid bulk reply' using errcode = '22023';
  end if;

  select array_agg(distinct id) into targets from unnest(array_prepend(p_inquiry, p_additional)) ids(id);
  target_count := cardinality(targets);
  if target_count <> cardinality(p_additional) + 1 then
    raise exception 'Select distinct inquiries' using errcode = '22023';
  end if;

  -- Lock in a consistent order so concurrent replies cannot both answer the same pending inquiry.
  perform 1 from public.inquiries where id = any(targets) order by id for update;
  select scholarship_id into topic from public.inquiries where id = p_inquiry and status = 'open';
  if not found then
    raise exception 'The selected inquiries changed' using errcode = 'P0001';
  end if;

  select count(distinct student_id) into matched from public.inquiries
  where id = any(targets) and status = 'open' and scholarship_id is not distinct from topic;
  if matched <> target_count then
    raise exception 'The selected inquiries changed' using errcode = 'P0001';
  end if;

  insert into public.inquiry_replies (inquiry_id, body)
  select id, body from unnest(targets) ids(id);
  return target_count;
end;
$$;

revoke execute on function public.similar_pending_inquiries(uuid) from public, anon;
revoke execute on function public.reply_to_pending_inquiries(uuid, uuid[], text) from public, anon;
grant execute on function public.similar_pending_inquiries(uuid) to authenticated;
grant execute on function public.reply_to_pending_inquiries(uuid, uuid[], text) to authenticated;
