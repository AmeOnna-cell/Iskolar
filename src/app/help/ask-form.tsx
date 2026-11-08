"use client";

import { Combobox } from "@/components/ui/combobox";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { askQuestion, type AskState } from "@/lib/actions/student";

export function AskForm({ options, about }: { options: Array<{ id: string; name: string }>; about?: string }) {
  const [state, action, pending] = useActionState<AskState, FormData>(askQuestion, { status: "idle" });
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} noValidate className="flex flex-col gap-4">
      {state.message ? (
        <Notice tone={state.status === "success" ? "ok" : "danger"} live>
          {state.message}
        </Notice>
      ) : null}
      <div className="flex flex-col gap-2">
        <label htmlFor="ask-topic" className="text-sm font-semibold text-ink">Topic</label>
        <Combobox id="ask-topic" name="scholarshipId" options={options.map((o) => [o.id, o.name])} emptyLabel="General question" defaultValue={about ?? ""} className={`${inputClass} border-hairline-strong`} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="ask-q" className="text-sm font-semibold text-ink">Your question</label>
        <textarea
          id="ask-q"
          name="question"
          required
          maxLength={2000}
          rows={4}
          placeholder="e.g. Can I apply if my COR isn’t released yet?"
          aria-invalid={state.fieldError ? true : undefined}
          aria-describedby={state.fieldError ? "ask-q-err" : undefined}
          className={`${inputClass} min-h-28 py-2 ${state.fieldError ? "border-danger" : "border-hairline-strong"}`}
        />
        {state.fieldError ? <p id="ask-q-err" className="text-caption font-semibold text-danger">{state.fieldError}</p> : null}
      </div>
      <Button type="submit" loading={pending}>Send question</Button>
      <p className="text-caption text-ink-hint">A scholarship coordinator usually replies within 2 school days.</p>
    </form>
  );
}
