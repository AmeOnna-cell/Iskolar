"use client";

import { useEffect, useState } from "react";
import { searchFaqs, type FaqHit } from "@/lib/actions/faqs";

export const MIN_CHARS = 3;

type Result = { query: string; hits: FaqHit[]; error?: string };

/**
 * Debounced FAQ search (300ms, from 3 characters), optionally ranked for a scholarship (`topic`).
 * - `settled`: some search has answered since the text reached 3 characters; `hits`/`error` are its
 *   results, kept on screen while the next search runs (no flashing back to the full list).
 * - `searching`: the shown results are for older text than what's in the box.
 */
export function useFaqSearch(text: string, topic = "") {
  const query = text.trim();
  const [result, setResult] = useState<Result>({ query: "", hits: [] });
  const key = `${topic}|${query}`;
  useEffect(() => {
    if (query.length < MIN_CHARS) return;
    let live = true;
    const t = setTimeout(async () => {
      const res = await searchFaqs(query, topic || undefined).catch(() => ({ ok: false as const, message: "Search isn't working right now. Try again." }));
      if (live) setResult(res.ok ? { query: key, hits: res.hits } : { query: key, hits: [], error: res.message });
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // `key` covers query and topic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const active = query.length >= MIN_CHARS;
  const settled = active && result.query !== "";
  return {
    active,
    settled,
    searching: active && result.query !== key,
    hits: settled ? result.hits : [],
    error: settled ? result.error : undefined,
  };
}

/** Lets the FAQ search hand its text to the ask form ("Ask the scholarship office"). */
export const ASK_EVENT = "iskolar:ask";
