"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { replyInquiry, setInquiryStatus } from "@/lib/actions/staff";

/** "Save as FAQ" (answered questions only): opens a draft FAQ filled in from the question and reply. */
function SaveAsFaq({ href, question }: { href?: string; question: string }) {
  if (!href) return null;
  return (
    <Link href={href} className="inline-flex min-h-11 items-center px-1 text-sm font-semibold nav:min-h-9">
      Save as FAQ<span className="sr-only">: {question}</span>
    </Link>
  );
}

export function InquiryActions({ id, status, faqHref, question }: { id: string; status: "open" | "answered" | "closed"; faqHref?: string; question: string }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [replying, setReplying] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fieldId = `reply-${id}`;

  const setStatus = (next: "open" | "answered" | "closed") =>
    start(async () => {
      const res = await setInquiryStatus(id, next);
      // Closing is reversible: offer it back, restoring the status it had.
      toast(res.message, res.ok ? "ok" : "danger", res.ok && next === "closed" ? { label: "Undo", run: () => setStatus(status) } : undefined);
    });

  if (status === "closed") {
    return (
      <div className="mt-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" loading={pending} onClick={() => setStatus("open")}>
            Reopen
          </Button>
          <SaveAsFaq href={faqHref} question={question} />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {replying ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await replyInquiry(id, body);
              if (!res.ok) {
                setError(res.message);
                document.getElementById(fieldId)?.focus();
                return;
              }
              setBody("");
              setError(null);
              setReplying(false);
              toast(res.message);
            });
          }}
          className="flex flex-col gap-2"
        >
          <label htmlFor={fieldId} className="text-sm font-semibold text-ink">
            Reply
          </label>
          <textarea
            id={fieldId}
            rows={3}
            value={body}
            maxLength={4000}
            autoFocus
            onChange={(e) => setBody(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-err` : undefined}
            className={`${inputClass} py-2 ${error ? "border-danger" : "border-hairline-strong"}`}
          />
          {error ? (
            <p id={`${fieldId}-err`} role="alert" className="text-caption font-semibold text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" loading={pending}>
              Send reply
            </Button>
            <Button
              type="button"
              variant="text"
              onClick={() => {
                setReplying(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setReplying(true)}>
            Reply
          </Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => setStatus("closed")}>
            Close question
          </Button>
          <SaveAsFaq href={faqHref} question={question} />
        </div>
      )}
    </div>
  );
}
