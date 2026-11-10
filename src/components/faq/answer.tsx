import Link from "next/link";
import { answerParts } from "@/lib/faq";

/** An FAQ answer: plain text (line breaks kept) with its [text](link) links. */
export function FaqAnswer({ answer, className = "" }: { answer: string; className?: string }) {
  return (
    <p className={`whitespace-pre-line ${className}`}>
      {answerParts(answer).map((p, i) =>
        typeof p === "string" ? (
          p
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
