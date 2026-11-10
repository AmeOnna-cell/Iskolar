"use client";

import Link from "next/link";
import { useState } from "react";
import { FaqAnswer } from "@/components/faq/answer";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { ASK_EVENT, useFaqSearch } from "./use-faq-search";

type Faq = { slug: string; question: string; answer: string };

/** "Common questions" with a search box over them (search_faqs). No matches → offer the ask form. */
export function FaqList({ faqs, ask }: { faqs: Faq[]; ask: "student" | "visitor" | null }) {
  const [text, setText] = useState("");
  const { active, done, hits, error } = useFaqSearch(text);
  // While a search is in flight, keep showing the full list rather than flashing empty.
  const shown: Faq[] = done ? hits : faqs;
  const query = text.trim();

  const askOffice = () => {
    window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: query }));
    document.getElementById("ask-h")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <div role="search" className="border-b border-hairline px-4 py-4 sm:px-6">
        <label htmlFor="faq-search" className="sr-only">
          Search the common questions
        </label>
        <div className="relative">
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-hint" />
          <input
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
        <p id="faq-search-status" aria-live="polite" className={done ? "mt-2 text-caption text-ink-secondary" : "sr-only"}>
          {done ? (error ?? (hits.length ? `${hits.length} ${hits.length === 1 ? "question matches" : "questions match"} “${query}”` : "")) : ""}
        </p>
      </div>

      {done && !hits.length && !error ? (
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
            <Button variant="text" onClick={() => setText("")}>
              Clear search
            </Button>
          </div>
        </div>
      ) : (
        <div aria-busy={active && !done ? true : undefined}>
          {shown.map((f) => (
            <details key={f.slug} id={`faq-${f.slug}`} className="group scroll-mt-24 border-t border-hairline first-of-type:border-t-0">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 font-semibold text-ink hover:bg-surface-hover sm:px-6 [&::-webkit-details-marker]:hidden">
                {f.question}
                <span aria-hidden="true" className="size-2.5 shrink-0 rotate-45 border-r-2 border-b-2 border-ink-hint transition-transform duration-150 group-open:-rotate-[135deg]" />
              </summary>
              <FaqAnswer answer={f.answer} className="max-w-[70ch] px-4 pb-6 text-ink-secondary sm:px-6" />
            </details>
          ))}
        </div>
      )}
      {done && hits.length ? (
        <p className="border-t border-hairline px-4 py-3 text-sm sm:px-6">
          <Button variant="text" onClick={() => setText("")}>
            Show all questions
          </Button>
        </p>
      ) : null}
      {!faqs.length ? <p className="px-4 py-8 text-center text-ink-secondary sm:px-6">No common questions yet. <Link href="#ask-h">Ask the office</Link>.</p> : null}
    </>
  );
}
