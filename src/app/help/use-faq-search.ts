"use client";

import { useEffect, useState } from "react";
import { searchFaqs, type FaqHit } from "@/lib/actions/faqs";

export const MIN_CHARS = 3;

/**
 * Debounced FAQ search (300ms, from 3 characters). `done` is true once the results match the
 * current text, so callers can tell "no matches" from "still searching". Stale replies are dropped.
 */
export function useFaqSearch(text: string) {
  const query = text.trim();
  const [result, setResult] = useState<{ query: string; hits: FaqHit[]; error?: string }>({ query: "", hits: [] });
  useEffect(() => {
    if (query.length < MIN_CHARS) return;
    let live = true;
    const t = setTimeout(async () => {
      const res = await searchFaqs(query).catch(() => ({ ok: false as const, message: "Search isn't working right now. Try again." }));
      if (live) setResult(res.ok ? { query, hits: res.hits } : { query, hits: [], error: res.message });
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query]);
  const active = query.length >= MIN_CHARS;
  const done = active && result.query === query;
  return { active, done, hits: active ? result.hits : [], error: done ? result.error : undefined };
}

/** Lets the FAQ search hand its text to the ask form ("Ask the scholarship office"). */
export const ASK_EVENT = "iskolar:ask";
