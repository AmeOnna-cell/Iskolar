import { FaqAnswer } from "@/components/faq/answer";
import type { FaqHit } from "@/lib/actions/faqs";
import { chevron } from "./faq-list";

export function FaqSuggestions({ hits, headingId }: { hits: FaqHit[]; headingId: string }) {
  if (!hits.length) return null;
  return (
    <section aria-labelledby={headingId} className="-mt-1 border-t border-hairline pt-3">
      <h3 id={headingId} className="pb-1 text-sm font-semibold text-ink">These answers might help</h3>
      <ul>
        {hits.map((h) => (
          <li key={h.id}>
            <details className="group">
              <summary className="-mx-2 flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-sm px-2 py-1.5 hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{h.question}</span>
                  <span className="block truncate text-sm text-ink-secondary group-open:hidden">{h.snippet}</span>
                </span>
                <span aria-hidden="true" className={chevron} />
              </summary>
              <FaqAnswer answer={h.answer} newTab className="pt-1 pb-3 text-sm text-ink-secondary" />
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
