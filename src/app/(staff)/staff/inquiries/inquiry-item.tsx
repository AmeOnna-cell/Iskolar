"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { replyInquiry, setInquiryStatus } from "@/lib/actions/staff";

export function InquiryActions({ id, status }: { id: string; status: "open" | "answered" | "closed" }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fieldId = `reply-${id}`;

  return (
    <div className="mt-4 flex flex-col gap-3">
      {status !== "closed" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await replyInquiry(id, body);
              if (!res.ok) {
                setError(res.message);
                return;
              }
              setBody("");
              setError(null);
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
            onChange={(e) => setBody(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-err` : undefined}
            className={`${inputClass} py-2 ${error ? "border-danger" : "border-hairline-strong"}`}
          />
          {error ? (
            <p id={`${fieldId}-err`} className="text-caption font-semibold text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" loading={pending}>
              Send reply
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => start(async () => toast((await setInquiryStatus(id, "closed")).message))}
            >
              Close question
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button variant="outline" size="sm" loading={pending} onClick={() => start(async () => toast((await setInquiryStatus(id, "open")).message))}>
            Reopen
          </Button>
        </div>
      )}
    </div>
  );
}
