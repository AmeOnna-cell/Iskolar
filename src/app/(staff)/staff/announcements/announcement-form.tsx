"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { inputClass } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { deleteAnnouncement, saveAnnouncement, type AnnouncementState } from "@/lib/actions/staff";

type Initial = { id?: string; title?: string; body?: string; posted_as?: string; scholarship_id?: string };
type Option = { id: string; name: string };

export function AnnouncementForm({ initial = {}, scholarships, onDone }: { initial?: Initial; scholarships: Option[]; onDone?: () => void }) {
  const toast = useToast();
  const [state, action, pending] = useActionState<AnnouncementState, FormData>(saveAnnouncement, { status: "idle" });
  const form = useRef<HTMLFormElement>(null);
  const e = state.fieldErrors ?? {};
  const prefix = initial.id ? `a-${initial.id}` : "a-new";
  const errorCount = Object.keys(e).length;
  // After a failed post, focus the first invalid field (its error is read with it), else the message.
  useEffect(() => {
    if (state.status !== "error") return;
    (form.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form.current?.querySelector<HTMLElement>("[data-form-message]"))?.focus();
  }, [state]);
  useEffect(() => {
    if (state.status === "success") {
      toast(state.message!);
      if (!initial.id) form.current?.reset();
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={form} action={action} noValidate className="flex flex-col gap-4">
      {state.status === "error" ? (
        <div data-form-message tabIndex={-1}>
          <Notice tone="danger" live>
            {state.message ?? `${errorCount} ${errorCount === 1 ? "thing" : "things"} to fix below.`}
          </Notice>
        </div>
      ) : null}
      <input type="hidden" name="id" value={initial.id ?? ""} />
      {(
        [
          ["title", "Title", initial.title, 140],
          ["posted_as", "Posted as", initial.posted_as ?? "Scholarship office", 120],
        ] as const
      ).map(([name, label, value, max]) => (
        <div key={name} className="flex flex-col gap-2">
          <label htmlFor={`${prefix}-${name}`} className="text-sm font-semibold text-ink">{label}</label>
          <input id={`${prefix}-${name}`} name={name} defaultValue={value} maxLength={max} aria-invalid={e[name] ? true : undefined} aria-describedby={e[name] ? `${prefix}-${name}-err` : undefined} className={`${inputClass} ${e[name] ? "border-danger" : "border-hairline-strong"}`} />
          {e[name] ? <p id={`${prefix}-${name}-err`} className="text-caption font-semibold text-danger">{e[name]}</p> : null}
        </div>
      ))}
      <div className="flex flex-col gap-2">
        <label htmlFor={`${prefix}-body`} className="text-sm font-semibold text-ink">Message</label>
        <textarea id={`${prefix}-body`} name="body" rows={4} defaultValue={initial.body} maxLength={4000} aria-invalid={e.body ? true : undefined} aria-describedby={e.body ? `${prefix}-body-err` : undefined} className={`${inputClass} py-2 ${e.body ? "border-danger" : "border-hairline-strong"}`} />
        {e.body ? <p id={`${prefix}-body-err`} className="text-caption font-semibold text-danger">{e.body}</p> : null}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${prefix}-sch`} className="text-sm font-semibold text-ink">
          About a scholarship <span className="font-normal text-ink-hint">(optional)</span>
        </label>
        <select id={`${prefix}-sch`} name="scholarship_id" defaultValue={initial.scholarship_id ?? ""} className={`${inputClass} border-hairline-strong`}>
          <option value="">Not about one scholarship</option>
          {scholarships.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <Button type="submit" loading={pending}>{initial.id ? "Save changes" : "Post announcement"}</Button>
      </div>
    </form>
  );
}

export function AnnouncementRowActions({ a, scholarships, canEdit }: { a: Required<Pick<Initial, "id">> & Initial; scholarships: Option[]; canEdit: boolean }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  if (!canEdit) return null;
  return (
    <div className="mt-3 flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit<span className="sr-only"> {a.title}</span></Button>
      <Button variant="outline-danger" size="sm" onClick={() => setConfirm(true)}>Delete<span className="sr-only"> {a.title}</span></Button>
      <Dialog open={editing} onOpenChange={setEditing} title="Edit announcement">
        <AnnouncementForm initial={a} scholarships={scholarships} onDone={() => setEditing(false)} />
      </Dialog>
      <Dialog open={confirm} onOpenChange={setConfirm} title="Delete this announcement?" description="Students won't see it on their dashboard anymore.">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteAnnouncement(a.id);
                toast(res.message, res.ok ? "ok" : "danger");
                setConfirm(false);
              })
            }
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
