import { Icon } from "@/components/icons";
import type { ScholarshipDetail } from "@/lib/data/scholarships";
import { SUBMISSION_METHODS } from "@/lib/reference";

type Submission = Pick<
  ScholarshipDetail,
  "submission_method" | "submission_place" | "submission_address" | "submission_hours" | "submission_url" | "submission_note"
>;

const host = (url: string) => {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "")).slice(0, 60);
  } catch {
    return url;
  }
};

/** "Where to submit": only the parts staff filled in; a plain fallback when nothing is set. */
export function WhereToSubmit({ s }: { s: Submission }) {
  const method = SUBMISSION_METHODS.find(([m]) => m === s.submission_method)?.[1];
  const rows = (
    [
      method ? ["How", method] : null,
      s.submission_place ? ["Where", s.submission_place] : null,
      s.submission_address ? ["Address", s.submission_address] : null,
      s.submission_hours ? ["Office hours", s.submission_hours] : null,
      s.submission_url
        ? [
            s.submission_method === "online" ? "Submit online at" : "Online",
            <a key="url" href={s.submission_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all">
              {host(s.submission_url)}
              <Icon name="ext" size={14} />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>,
          ]
        : null,
      s.submission_note ? ["Note", s.submission_note] : null,
    ] as Array<[string, React.ReactNode] | null>
  ).filter((r): r is [string, React.ReactNode] => r !== null);

  if (!rows.length) return <p className="text-ink-secondary">Confirm with the provider where to submit.</p>;
  return (
    <dl className="grid gap-x-6 gap-y-3 text-base sm:grid-cols-[170px_minmax(0,1fr)]" data-testid="where-to-submit">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-ink-hint">{label}</dt>
          <dd className="max-sm:-mt-2 max-sm:mb-1">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
