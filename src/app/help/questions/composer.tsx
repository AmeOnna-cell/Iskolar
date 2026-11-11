"use client";

import { useActionState, useState } from "react";
import { followUpInquiry } from "@/lib/actions/student";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { FaqSuggestions } from "../faq-suggestions";
import { ListingSuggestions } from "../listing-suggestions";
import { MIN_CHARS, useFaqSearch } from "../use-faq-search";

export function InquiryComposer({ id, scholarshipId }: { id: string; scholarshipId: string | null }) {
  const [body, setBody] = useState("");
  const query = body.trim();
  const topic = scholarshipId ?? "";
  const { hits, searching } = useFaqSearch(query, topic);
  const [state, action, pending] = useActionState(async (previous: Parameters<typeof followUpInquiry>[0], form: FormData) => {
    const result = await followUpInquiry(previous, form);
    if (result.status === "success") setBody("");
    return result;
  }, { status: "idle" });
  return (
    <form action={action} className="mt-auto border-t border-hairline pt-4">
      <input type="hidden" name="inquiryId" value={id} />
      <div className="mb-3 space-y-3 empty:hidden">
        <FaqSuggestions hits={searching ? [] : hits} headingId="inquiry-suggest-h" />
        {query.length >= MIN_CHARS ? <ListingSuggestions topic={topic} question={query.slice(0, 2000)} /> : null}
      </div>
      <label htmlFor="inquiry-message" className="sr-only">Send a message</label>
      <div className="flex items-end gap-2 rounded-2xl border border-hairline-strong bg-surface px-2 py-1.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <textarea
          id="inquiry-message"
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
          maxLength={4000}
          rows={1}
          placeholder="Write a message…"
          className="min-h-11 max-h-40 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2.5 text-base text-ink outline-none placeholder:text-ink-hint [field-sizing:content]"
        />
        <Button type="submit" aria-label="Send" title="Send message" loading={pending} disabled={!query} className="size-11 shrink-0 rounded-xl px-0">
          {pending ? null : <Icon name="send" size={18} />}
        </Button>
      </div>
      {state.message ? <p role="status" className={`mt-2 text-sm ${state.status === "error" ? "text-danger" : "text-ink-secondary"}`}>{state.message}</p> : null}
    </form>
  );
}
