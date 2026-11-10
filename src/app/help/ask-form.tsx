"use client";

import { Combobox } from "@/components/ui/combobox";
import { useActionState, useEffect, useRef, useState } from "react";
import { FaqAnswer } from "@/components/faq/answer";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { askQuestion, type AskState } from "@/lib/actions/student";
import { chevron } from "./faq-list";
import { ASK_EVENT, useFaqSearch } from "./use-faq-search";

export function AskForm({ options, about }: { options: Array<{ id: string; name: string }>; about?: string }) {
  const [state, action, pending] = useActionState<AskState, FormData>(askQuestion, { status: "idle" });
  const [question, setQuestion] = useState("");
  const [topic, setTopic] = useState(about ?? "");
  const { settled, hits, searching } = useFaqSearch(question, topic);
  const form = useRef<HTMLFormElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.status === "success") form.current?.reset();
  }, [state]);

  // "Ask the scholarship office" from a search with no matches: carry the words over, unless the
  // student has already started writing here.
  useEffect(() => {
    const onAsk = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      const el = field.current;
      if (!el) return;
      if (text && !el.value.trim()) {
        el.value = text;
        setQuestion(text);
      }
      el.focus({ preventScroll: true });
    };
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, []);

  return (
    // The textarea stays uncontrolled: React resets the form's DOM after each action (to
    // `defaultValue`, which holds what was typed when sending failed). `question` mirrors the text
    // for suggestions and re-reads it once a reset has finished.
    <form ref={form} action={action} onReset={() => queueMicrotask(() => setQuestion(field.current?.value ?? ""))} noValidate className="flex flex-col gap-4">
      {state.message ? (
        <Notice tone={state.status === "success" ? "ok" : "danger"} live>
          {state.message}
        </Notice>
      ) : null}
      <div className="flex flex-col gap-2">
        <label htmlFor="ask-topic" className="text-sm font-semibold text-ink">Topic</label>
        <Combobox
          id="ask-topic"
          name="scholarshipId"
          options={options.map((o) => [o.id, o.name])}
          emptyLabel="General question"
          defaultValue={state.values?.scholarshipId ?? about ?? ""}
          onChange={setTopic}
          className={`${inputClass} border-hairline-strong`}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="ask-q" className="text-sm font-semibold text-ink">Your question</label>
        <textarea
          ref={field}
          id="ask-q"
          name="question"
          required
          maxLength={2000}
          rows={4}
          defaultValue={state.values?.question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Can I apply if my COR isn’t released yet?"
          aria-invalid={state.fieldError ? true : undefined}
          aria-describedby={[state.fieldError ? "ask-q-err" : "", hits.length ? "ask-suggest-h" : ""].filter(Boolean).join(" ") || undefined}
          className={`${inputClass} min-h-28 py-2 ${state.fieldError ? "border-danger" : "border-hairline-strong"}`}
        />
        {state.fieldError ? <p id="ask-q-err" className="text-caption font-semibold text-danger">{state.fieldError}</p> : null}
      </div>

      <p aria-live="polite" className="sr-only">
        {settled && !searching && hits.length ? `${hits.length} ${hits.length === 1 ? "answer" : "answers"} might help, below your question.` : ""}
      </p>
      {hits.length ? (
        // Part of the form, not a card: a hairline, a label, one line per answer (it opens in place).
        <section aria-labelledby="ask-suggest-h" className="-mt-1 border-t border-hairline pt-3">
          <h3 id="ask-suggest-h" className="pb-1 text-sm font-semibold text-ink">These answers might help</h3>
          <ul>
            {hits.map((h) => (
              <li key={h.id}>
                <details className="group">
                  <summary className="-mx-2 flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-sm px-2 py-1.5 hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{h.question}</span>
                      <span className="block truncate text-sm text-ink-secondary group-open:hidden">{h.snippet}</span>
                    </span>
                    <span aria-hidden="true" className={chevron} />
                  </summary>
                  <FaqAnswer answer={h.answer} newTab className="pt-1 pb-3 text-sm text-ink-secondary" />
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Button type="submit" loading={pending}>Send question</Button>
      <p className={hits.length ? "text-sm text-ink-secondary" : "text-caption text-ink-hint"}>
        {hits.length ? "Still need help? Send your question anyway. " : ""}A scholarship coordinator usually replies within 2 school days.
      </p>
    </form>
  );
}
