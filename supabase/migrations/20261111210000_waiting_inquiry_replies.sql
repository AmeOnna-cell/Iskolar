-- The parent row lock serializes staff replies and student follow-ups.
create or replace function public.inquiry_replies_bookkeeping() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  asker uuid;
  topic uuid;
  inquiry_status public.inquiry_status;
begin
  if tg_op = 'INSERT' then
    new.author_id := coalesce(auth.uid(), new.author_id);
    select student_id, scholarship_id, status into asker, topic, inquiry_status
      from public.inquiries where id = new.inquiry_id for update;
    if new.author_id = asker then
      if inquiry_status = 'closed' then
        raise exception 'This inquiry is closed' using errcode = '42501';
      end if;
      update public.inquiries set status = 'open' where id = new.inquiry_id;
    else
      if auth.uid() is not null and (inquiry_status is null or not public.staff_can_manage_inquiry_topic(topic)) then
        raise exception 'This inquiry is unavailable' using errcode = '42501';
      end if;
      if auth.uid() is not null and inquiry_status <> 'open' then
        raise exception 'This inquiry is not waiting for a reply' using errcode = 'P0001';
      end if;
      update public.inquiries set status = 'answered' where id = new.inquiry_id and status = 'open';
    end if;
  elsif new.author_id is distinct from old.author_id or new.inquiry_id is distinct from old.inquiry_id then
    raise exception 'A reply cannot move' using errcode = '42501';
  end if;
  return new;
end $$;
