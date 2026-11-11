"use client";

import Link from "next/link";
import type { ListingAnswer } from "@/lib/inquiry-suggestions";
import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { replyInquiry, replyToSimilarInquiries, setInquiryStatus } from "@/lib/actions/staff";

/** "Save as FAQ" (answered questions only): opens a draft FAQ filled in from the question and reply. */
function SaveAsFaq({ href, question }: { href?: string; question: string }) {
  if (!href) return null;
  return (
    <Link href={href} className="inline-flex min-h-11 items-center px-1 text-sm font-semibold nav:min-h-9">
      Save as FAQ<span className="sr-only">: {question}</span>
    </Link>
  );
}

type SimilarQuestion = { id: string; question: string; updated: string };

function SimilarQuestions({ items, selected = [], disabled, onSelect, onReply }: {
  items: SimilarQuestion[];
  selected?: string[];
  disabled?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  onReply?: () => void;
}) {
  return (
    <details open={onSelect ? true : undefined} className="group rounded-md border border-hairline bg-surface-subtle">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        <Icon name="chevron" size={16} className="-rotate-90 transition-transform group-open:rotate-0" />
        Similar questions
        <span className="tnum rounded-full border border-hairline bg-surface px-2 text-caption text-ink-secondary">{items.length}</span>
      </summary>
      <div className="border-t border-hairline px-4 pb-3">
        <p className="pt-2 text-sm text-ink-secondary">
          {onSelect ? "Choose which questions this reply also answers." : "Matches use shared words and similar spelling in pending questions for this scholarship. Review them before sending one answer."}
        </p>
        <ul className="divide-y divide-hairline">
          {items.map((item) => (
            <li key={item.id}>
              {onSelect ? (
                <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5">
                  <input type="checkbox" checked={selected.includes(item.id)} disabled={disabled} onChange={(event) => onSelect(item.id, event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-primary" />
                  <span className="min-w-0 flex-1 wrap-anywhere text-sm text-ink">{item.question}</span>
                  <span className="shrink-0 text-caption text-ink-secondary">{item.updated}</span>
                </label>
              ) : (
                <div className="flex items-start justify-between gap-3 py-2.5 text-sm text-ink">
                  <span className="min-w-0 wrap-anywhere">{item.question}</span>
                  <span className="shrink-0 text-caption text-ink-secondary">{item.updated}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
        {onReply ? <Button type="button" size="sm" onClick={onReply} className="mt-2">Reply to this group</Button> : null}
      </div>
    </details>
  );
}

export function InquiryActions({ id, status, faqHref, question, suggestions = [], similar = [] }: {
  id: string;
  status: "open" | "answered" | "closed";
  faqHref?: string;
  question: string;
  suggestions?: ListingAnswer[];
  similar?: SimilarQuestion[];
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const additional = similar.filter((item) => selected.includes(item.id)).map((item) => item.id);
  const input = useRef<HTMLTextAreaElement>(null);
  const fieldId = `reply-${id}`;

  const startBatchReply = () => {
    setSelected(similar.map((item) => item.id));
    setBatchMode(true);
    input.current?.focus();
  };

  const setStatus = (next: "open" | "answered" | "closed") =>
    start(async () => {
      const res = await setInquiryStatus(id, next);
      if (res.ok) setConfirmReopen(false);
      // Closing is reversible: offer it back, restoring the status it had.
      toast(res.message, res.ok ? "ok" : "danger", res.ok && next === "closed" ? { label: "Undo", run: () => setStatus(status) } : undefined);
    });

  if (status === "closed") {
    return (
      <div className="mt-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmReopen(true)}>
            Reopen
          </Button>
          <SaveAsFaq href={faqHref} question={question} />
        </div>
        <Dialog open={confirmReopen} onOpenChange={(open) => { if (!pending) setConfirmReopen(open); }} title="Reopen this inquiry?" description="This returns the inquiry to Waiting and lets the student send follow-up messages.">
          <p className="mb-4 wrap-anywhere text-sm text-ink">{question}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirmReopen(false)}>Cancel</Button>
            <Button type="button" loading={pending} onClick={() => setStatus("open")}>Reopen inquiry</Button>
          </div>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="border-t border-hairline pt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {similar.length && !batchMode ? (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={startBatchReply}>
            Batch reply ({similar.length + 1})
          </Button>
        ) : null}
        {batchMode ? (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => {
            setBatchMode(false);
            setSelected([]);
            setError(null);
          }}>
            Reply to this inquiry only
          </Button>
        ) : null}
        <details className="relative">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-sm border border-hairline-strong px-3 text-sm font-semibold text-ink hover:bg-surface-hover nav:min-h-9 [&::-webkit-details-marker]:hidden">
            More actions <Icon name="chevron" size={14} className="ml-1" />
          </summary>
          <div className="absolute left-0 top-full z-10 mt-1 min-w-max rounded-sm border border-hairline bg-surface p-1 shadow-overlay">
            <Button type="button" variant="text" size="sm" disabled={pending} onClick={() => setStatus("closed")} className="px-2">Close question</Button>
          </div>
        </details>
        <SaveAsFaq href={faqHref} question={question} />
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (additional.length !== selected.length) {
            setSelected(additional);
            setError("The group changed. Review the remaining questions before sending.");
            return;
          }
          start(async () => {
            const res = additional.length
              ? await replyToSimilarInquiries(id, additional, body)
              : await replyInquiry(id, body);
            if (!res.ok) {
              setError(res.message);
              input.current?.focus();
              return;
            }
            setBody("");
            setSelected([]);
            setError(null);
            setBatchMode(false);
            toast(res.message);
          });
        }}
      >
        {similar.length ? (
          <SimilarQuestions
            items={similar}
            selected={selected}
            disabled={pending}
            onSelect={batchMode ? (id, checked) => setSelected((ids) => checked ? [...ids, id] : ids.filter((value) => value !== id)) : undefined}
            onReply={batchMode ? undefined : startBatchReply}
          />
        ) : null}
        {suggestions.length ? (
          <details className="rounded-md border border-hairline bg-surface-subtle px-3">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-ink">Suggested replies from the listing</summary>
            <div className="flex flex-wrap gap-2 border-t border-hairline py-2">
              {suggestions.map((suggestion) => (
                <Button key={suggestion.question} type="button" size="sm" variant="text" onClick={() => {
                  setBody(suggestion.answer);
                  input.current?.focus();
                }}>
                  Use answer: {suggestion.question}
                </Button>
              ))}
            </div>
          </details>
        ) : null}
        <div className="flex items-end gap-2 rounded-2xl border border-hairline-strong bg-surface px-2 py-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <label htmlFor={fieldId} className="sr-only">Reply</label>
          <textarea
            ref={input}
            id={fieldId}
            rows={1}
            value={body}
            maxLength={4000}
            required
            placeholder="Write a reply…"
            onChange={(event) => setBody(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-err` : undefined}
            className="min-h-11 max-h-40 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2.5 text-base text-ink outline-none placeholder:text-ink-hint [field-sizing:content]"
          />
          <Button type="submit" loading={pending} disabled={!body.trim()} className="min-h-11 shrink-0 rounded-xl px-3">
            {pending ? null : <Icon name="send" size={16} />}
            {additional.length ? (
              <><span className="hidden sm:inline">Send reply to {additional.length + 1} inquiries</span><span aria-hidden="true" className="sm:hidden">{additional.length + 1}</span><span className="sr-only sm:hidden">Send reply to {additional.length + 1} inquiries</span></>
            ) : <span className="sr-only sm:not-sr-only">Send reply</span>}
          </Button>
        </div>
        {error ? <p id={`${fieldId}-err`} role="alert" className="text-caption font-semibold text-danger">{error}</p> : null}
      </form>
    </div>
  );
}
