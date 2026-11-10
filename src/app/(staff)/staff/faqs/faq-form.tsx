"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FaqAnswer } from "@/components/faq/answer";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { inputClass } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { saveFaq, type FaqState } from "@/lib/actions/faqs";
import type { FaqStatus } from "@/lib/faq";

export type FaqInitial = { id?: string; question: string; answer: string; keywords: string[]; scholarship_id: string | null; status?: FaqStatus };
type Intent = FaqStatus;
type Option = { id: string; name: string };

/** Which buttons each role gets for an FAQ in each status: [intent, label, variant]. */
function actionsFor(isAdmin: boolean, status: FaqStatus | undefined): Array<[Intent, string, "primary" | "outline"]> {
  if (!isAdmin) return [["draft", "Save draft", "primary"]];
  switch (status) {
    case undefined:
      return [["approved", "Approve and publish", "primary"], ["draft", "Save draft", "outline"]];
    case "draft":
      return [["approved", "Approve and publish", "primary"], ["draft", "Save draft", "outline"], ["archived", "Archive", "outline"]];
    case "approved":
      return [["approved", "Save changes", "primary"], ["draft", "Move back to draft", "outline"], ["archived", "Archive", "outline"]];
    case "archived":
      return [["approved", "Approve and publish", "primary"], ["draft", "Save as draft", "outline"]];
  }
}

/** What a coordinator sees for an approved or archived FAQ: the content, not a disabled form. */
function ReadOnly({ initial, scholarships }: { initial: FaqInitial; scholarships: Option[] }) {
  const topic = scholarships.find((s) => s.id === initial.scholarship_id)?.name;
  return (
    <div className="flex flex-col gap-5">
      <Notice>Only an admin can change an {initial.status} FAQ. Ask an admin, or add a new draft.</Notice>
      <dl className="flex flex-col gap-4">
        {(
          [
            ["Question", <p key="q" className="font-semibold text-ink">{initial.question}</p>],
            ["Answer", <FaqAnswer key="a" answer={initial.answer} className="text-ink" />],
            ["Keywords", <p key="k" className="text-ink">{initial.keywords.length ? initial.keywords.join(", ") : "None"}</p>],
            ["About a scholarship", <p key="s" className="text-ink">{topic ?? (initial.scholarship_id ? "A scholarship that isn't published" : "Not about one scholarship")}</p>],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm font-semibold text-ink-secondary">{label}</dt>
            <dd className="mt-1">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function FaqForm({ initial, isAdmin, scholarships }: { initial: FaqInitial; isAdmin: boolean; scholarships: Option[] }) {
  const [state, action, pending] = useActionState<FaqState, FormData>(saveFaq, { status: "idle" });
  const [intent, setIntent] = useState<Intent>("draft");
  const [answer, setAnswer] = useState(initial.answer);
  const form = useRef<HTMLFormElement>(null);
  const e = state.fieldErrors ?? {};
  // React resets the form after each action; on errors the fields fall back to what was typed.
  const v = state.values ?? { ...initial, keywords: initial.keywords.join(", "), scholarship_id: initial.scholarship_id ?? "" };

  useEffect(() => {
    if (state.status !== "error") return;
    (form.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form.current?.querySelector<HTMLElement>("[data-form-message]"))?.focus();
  }, [state]);

  if (!isAdmin && initial.status && initial.status !== "draft") return <ReadOnly initial={initial} scholarships={scholarships} />;

  const field = (name: string) => ({
    id: `faq-${name}`,
    name,
    "aria-invalid": e[name] ? true : undefined,
    "aria-describedby": [`faq-${name}-hint`, e[name] ? `faq-${name}-err` : ""].filter(Boolean).join(" "),
  });
  const err = (name: string) => (e[name] ? <p id={`faq-${name}-err`} className="text-caption font-semibold text-danger">{e[name]}</p> : null);

  return (
    <form ref={form} action={action} noValidate className="flex flex-col gap-5">
      {state.status === "error" ? (
        <div data-form-message tabIndex={-1}>
          <Notice tone="danger" live>{state.message}</Notice>
        </div>
      ) : null}
      <input type="hidden" name="id" value={initial.id ?? ""} />
      <div className="flex flex-col gap-2">
        <label htmlFor="faq-question" className="text-sm font-semibold text-ink">Question</label>
        <p id="faq-question-hint" className="-mt-1 text-caption text-ink-hint">Write it the way a student would ask it.</p>
        <input {...field("question")} defaultValue={v.question} maxLength={200} className={`${inputClass} ${e.question ? "border-danger" : "border-hairline-strong"}`} />
        {err("question")}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="faq-answer" className="text-sm font-semibold text-ink">Answer</label>
        <p id="faq-answer-hint" className="-mt-1 text-caption text-ink-hint">Plain text. Add a link as [text](/check) or [text](https://…).</p>
        <textarea {...field("answer")} defaultValue={v.answer} onChange={(ev) => setAnswer(ev.target.value)} rows={6} maxLength={4000} className={`${inputClass} py-2 ${e.answer ? "border-danger" : "border-hairline-strong"}`} />
        {err("answer")}
        {answer.trim() ? (
          <div className="rounded-sm bg-surface-subtle px-3 py-2">
            <p className="text-caption font-semibold text-ink-secondary">How students see it</p>
            <FaqAnswer answer={answer} newTab className="mt-1 text-sm text-ink" />
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="faq-keywords" className="text-sm font-semibold text-ink">
          Keywords <span className="font-normal text-ink-hint">(optional)</span>
        </label>
        <p id="faq-keywords-hint" className="-mt-1 text-caption text-ink-hint">
          Other words students might type, separated by commas. Add Filipino and Taglish terms, e.g. paalala, brgy.
        </p>
        <input {...field("keywords")} defaultValue={v.keywords} maxLength={1000} className={`${inputClass} ${e.keywords ? "border-danger" : "border-hairline-strong"}`} />
        {err("keywords")}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="faq-sch" className="text-sm font-semibold text-ink">
          About a scholarship <span className="font-normal text-ink-hint">(optional)</span>
        </label>
        <Combobox id="faq-sch" name="scholarship_id" options={scholarships.map((s) => [s.id, s.name])} emptyLabel="Not about one scholarship" defaultValue={v.scholarship_id} className={`${inputClass} border-hairline-strong`} />
      </div>
      <div className="flex flex-wrap gap-2">
        {actionsFor(isAdmin, initial.status).map(([value, label, variant]) => (
          <Button
            key={value}
            type="submit"
            variant={variant}
            loading={pending && intent === value}
            disabled={pending}
            // Each button sets its own intent (the submitter's name/value isn't passed to client actions).
            formAction={(fd: FormData) => {
              setIntent(value);
              fd.set("intent", value);
              action(fd);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      {!isAdmin ? <p className="text-caption text-ink-hint">An admin reviews drafts before students see them.</p> : null}
    </form>
  );
}
