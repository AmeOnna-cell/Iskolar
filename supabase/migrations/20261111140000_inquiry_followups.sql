-- Students can continue their own open or answered inquiry. Replies reopen the staff queue.
create policy "inquiry_replies: student follow up"
on public.inquiry_replies for insert to authenticated
with check (
  (select public.is_student())
  and author_id = (select auth.uid())
  and exists (
    select 1 from public.inquiries i
    where i.id = inquiry_id and i.student_id = (select auth.uid()) and i.status <> 'closed'
  )
);

create or replace function public.inquiry_replies_bookkeeping() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  asker uuid;
  inquiry_status public.inquiry_status;
begin
  if tg_op = 'INSERT' then
    new.author_id := coalesce(auth.uid(), new.author_id);
    select student_id, status into asker, inquiry_status
      from public.inquiries where id = new.inquiry_id for update;
    if new.author_id = asker then
      if inquiry_status = 'closed' then
        raise exception 'This inquiry is closed' using errcode = '42501';
      end if;
      update public.inquiries set status = 'open' where id = new.inquiry_id;
    else
      update public.inquiries set status = 'answered' where id = new.inquiry_id and status = 'open';
    end if;
  elsif new.author_id is distinct from old.author_id or new.inquiry_id is distinct from old.inquiry_id then
    raise exception 'A reply cannot move' using errcode = '42501';
  end if;
  return new;
end $$;
