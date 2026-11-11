import type { EditableListing } from "@/lib/data/staff";
import { formatDate } from "@/lib/format";
import { criteriaItems } from "@/lib/eligibility";
import { RequirementRows } from "@/components/scholarship/criteria";
import { WhereToSubmit } from "@/components/scholarship/where-to-submit";

export function ListingPreview({ listing: s, provider }: { listing: EditableListing; provider?: string }) {
  const details = [
    ["Provider", provider],
    ["Award", s.amount_text],
    ["Location", s.location_label],
    ["Applications open", s.opens_on ? formatDate(s.opens_on, true) : "To be announced"],
    ["Deadline", s.closes_on ? formatDate(s.closes_on, true) : "To be announced"],
    ["Source", s.source_label],
    ["Duration", s.duration],
    ["Renewal", s.renewal],
    ["Obligations", s.obligations],
  ].filter(([, value]) => value);
  const lists = [
    { title: "Benefits", items: s.benefits.map((item) => ({ id: item.id, text: item.text })) },
    { title: "Documents to prepare", items: s.documents.map((item) => ({ id: item.id, text: [item.name, item.where_to_get].filter(Boolean).join(" · ") })) },
    { title: "How to apply", items: s.steps.map((item) => ({ id: item.id, text: [item.title, item.detail].filter(Boolean).join(" · ") })) },
    { title: "Additional requirements", items: s.notes.map((item) => ({ id: item.id, text: item.text })) },
  ];
  return (
    <div className="space-y-5 rounded-md border border-hairline bg-surface p-5 sm:p-6">
      <dl className="grid gap-4 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="text-caption text-ink-secondary">{label}</dt>
            <dd className="wrap-anywhere text-sm font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {s.summary ? <p className="whitespace-pre-wrap text-sm text-ink">{s.summary}</p> : null}
      {s.criteria ? (
        <section className="border-t border-hairline pt-4">
          <h2 className="mb-2 font-semibold text-ink">Eligibility requirements</h2>
          <RequirementRows items={criteriaItems(s.criteria)} answered={false} />
        </section>
      ) : null}
      {lists.filter(({ items }) => items.length > 0).map(({ title, items }) => (
        <section key={title} className="border-t border-hairline pt-4">
          <h2 className="mb-2 font-semibold text-ink">{title}</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-secondary">
            {items.map((item) => <li key={item.id}>{item.text}</li>)}
          </ul>
        </section>
      ))}
      <section className="border-t border-hairline pt-4">
        <h2 className="mb-2 font-semibold text-ink">Where to submit</h2>
        <WhereToSubmit s={s} />
      </section>
    </div>
  );
}
