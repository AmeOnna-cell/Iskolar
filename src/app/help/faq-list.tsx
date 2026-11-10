"use client";

import { useEffect, useRef, useState } from "react";
import { FaqAnswer } from "@/components/faq/answer";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ASK_EVENT, MIN_CHARS, useFaqSearch } from "./use-faq-search";

type Faq = { slug: string; question: string; answer: string };

export const chevron = "size-2.5 shrink-0 rotate-45 border-r-2 border-b-2 border-ink-hint transition-transform duration-150 group-open:-rotate-[135deg]";

/** "Common questions" with a search box over them (search_faqs). No matches → offer the ask form. */
export function FaqList({ faqs, ask }: { faqs: Faq[]; ask: "student" | "visitor" | null }) {
  const [text, setText] = useState("");
  const { active, settled, searching, hits, error } = useFaqSearch(text);
  const input = useRef<HTMLInputElement>(null);
  const query = text.trim();
  // A failed or rate-limited search keeps the full list readable.
  const showHits = settled && !error;
  const shown: Faq[] = showHits ? hits : faqs;
  const noMatch = showHits && hits.length === 0;

  // /help#faq-… opens that answer, on arrival and when the hash changes.
  useEffect(() => {
    const open = () => {
      const el = window.location.hash.startsWith("#faq-") ? document.getElementById(window.location.hash.slice(1)) : null;
      if (el instanceof HTMLDetailsElement) el.open = true;
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);

  const clear = () => {
    setText("");
    input.current?.focus();
  };

  const askOffice = () => {
    window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: query }));
    document.getElementById("ask-h")?.closest("section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!faqs.length) return <p className="px-4 py-8 text-center text-ink-secondary sm:px-6">No common questions yet.</p>;

  const status = !query
    ? ""
    : !active
      ? `Type at least ${MIN_CHARS} letters to search.`
      : noMatch
          ? `No questions match “${query}”.`
          : showHits
            ? `${hits.length} ${hits.length === 1 ? "question matches" : "questions match"} “${query}”`
            : "";

  return (
    <>
      <div role="search" className="border-b border-hairline px-4 pt-4 pb-2 sm:px-6">
        <label htmlFor="faq-search" className="sr-only">
          Search the common questions
        </label>
        <div className="relative">
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-hint" />
          <input
            ref={input}
            id="faq-search"
            type="search"
            value={text}
            maxLength={200}
            autoComplete="off"
            placeholder="Search, e.g. barangay certificate"
            onChange={(e) => setText(e.target.value)}
            aria-describedby="faq-search-status"
            className={`${inputClass} border-hairline-strong pl-10`}
          />
        </div>
        {/* One reserved line, so results don't jump when the status appears. */}
        <p id="faq-search-status" aria-live="polite" className={noMatch ? "sr-only" : "min-h-5 pt-1.5 text-caption text-ink-secondary"}>
          {/* "Searching…" is shown, not announced; the result count is. */}
          {searching ? <span aria-hidden="true">Searching…</span> : status}
        </p>
        {error ? (
          <div className="pb-2">
            <Notice tone="info">{error} Showing all questions.</Notice>
          </div>
        ) : null}
      </div>

      {noMatch ? (
        <div className="px-4 py-8 text-center sm:px-6">
          <h3 className="font-semibold text-ink">No matches for “{query}”</h3>
          <p className="mx-auto mt-1 max-w-[50ch] text-sm text-ink-secondary">
            {ask ? "Try other words, or ask the scholarship office. A coordinator usually replies within 2 school days." : "Try other words."}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {ask === "student" ? (
              <Button size="sm" onClick={askOffice}>
                Ask the scholarship office
              </Button>
            ) : ask === "visitor" ? (
              <a href="#ask-h" className="inline-flex min-h-11 items-center px-1 text-sm font-semibold">
                Ask the scholarship office
              </a>
            ) : null}
            <Button variant="text" onClick={clear}>
              Clear search
            </Button>
          </div>
        </div>
      ) : (
        <div aria-busy={searching || undefined}>
          {shown.map((f) => (
            <details key={f.slug} id={`faq-${f.slug}`} open={showHits && hits.length === 1 ? true : undefined} className="group scroll-mt-24 border-t border-hairline first-of-type:border-t-0">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 font-semibold text-ink hover:bg-surface-hover sm:px-6 [&::-webkit-details-marker]:hidden">
                {f.question}
                <span aria-hidden="true" className={chevron} />
              </summary>
              <FaqAnswer answer={f.answer} className="max-w-[70ch] px-4 pb-6 text-ink-secondary sm:px-6" />
            </details>
          ))}
        </div>
      )}
      {showHits && hits.length ? (
        <p className="border-t border-hairline px-4 py-2 text-sm sm:px-6">
          <Button variant="text" onClick={clear}>
            Show all questions
          </Button>
        </p>
      ) : null}
    </>
  );
}
