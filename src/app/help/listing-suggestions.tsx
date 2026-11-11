"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { suggestListingAnswers } from "@/lib/actions/inquiry-suggestions";
import type { ListingAnswer } from "@/lib/inquiry-suggestions";

export function ListingSuggestions({ topic, question }: { topic: string; question: string }) {
  const [result, setResult] = useState<{ topic: string; question: string; answers: ListingAnswer[] }>();
  useEffect(() => {
    if (!topic) return;
    let live = true;
    const timer = setTimeout(async () => {
      const answers = await suggestListingAnswers(topic, question).catch(() => []);
      if (live) setResult({ topic, question, answers });
    }, 300);
    return () => { live = false; clearTimeout(timer); };
  }, [topic, question]);
  if (!result || result.topic !== topic || result.question !== question || !result.answers.length) return null;
  return (
    <section aria-label="Answers from scholarship details" className="border-t border-hairline pt-3">
      <h3 className="text-sm font-semibold text-ink">From the scholarship details</h3>
      <ul className="mt-2 divide-y divide-hairline">
        {result.answers.map((answer) => (
          <li key={answer.question}>
            <details className="py-2">
              <summary className="cursor-pointer text-sm font-semibold text-primary">{answer.question}</summary>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-secondary">{answer.answer}</p>
              <Link href={answer.href} className="inline-flex min-h-11 items-center text-sm font-semibold">View scholarship details</Link>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
