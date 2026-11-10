import Link from "next/link";
import { answerParts } from "@/lib/faq";

/**
 * An FAQ answer: plain text (line breaks kept) with its [text](link) links. `newTab` opens links in a
 * new tab (inside the ask form, so a half-written question isn't lost).
 */
export function FaqAnswer({ answer, className = "", newTab = false }: { answer: string; className?: string; newTab?: boolean }) {
  return (
    <p className={`whitespace-pre-line ${className}`}>
      {answerParts(answer).map((p, i) =>
        typeof p === "string" ? (
          p
        ) : newTab ? (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer">
            {p.text}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : p.href.startsWith("/") ? (
          <Link key={i} href={p.href}>
            {p.text}
          </Link>
        ) : (
          <a key={i} href={p.href} rel="noopener noreferrer">
            {p.text}
          </a>
        ),
      )}
    </p>
  );
}
