import { Icon } from "@/components/icons";
import type { ScholarshipDetail } from "@/lib/data/scholarships";

type Submission = Pick<
  ScholarshipDetail,
  | "submission_method"
  | "submission_place"
  | "submission_address"
  | "submission_hours"
  | "submission_url"
  | "submission_note"
  | "source_url"
  | "is_sample"
>;

const link = "inline-flex min-h-11 items-center gap-1 [overflow-wrap:anywhere] nav:min-h-0";

/** "sei.dost.gov.ph/apply/…": host and path, shortened with an ellipsis. */
export function shortUrl(url: string) {
  try {
    const u = new URL(url);
    const s = u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "");
    return s.length > 48 ? `${s.slice(0, 47)}…` : s;
  } catch {
    return url;
  }
}

function External({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={link}>
      {children}
      <Icon name="ext" size={14} />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** The answer in one line: how, and where. Plain text (no link), for summaries. */
export function submissionSummary(s: Pick<Submission, "submission_method" | "submission_place" | "submission_url">): string | null {
  const place = s.submission_place;
  switch (s.submission_method) {
    case "in_person":
      return place ? `In person at ${place}` : "In person";
    case "online":
      return s.submission_url ? `Online at ${shortUrl(s.submission_url)}` : "Online";
    case "mail":
      return place ? `By mail or courier to ${place}` : "By mail or courier";
    case "through_school":
      return place ? `Through your school: ${place}` : "Through your school";
    default:
      return place;
  }
}

/** "Where to submit": a lead line (how and where), then only the details staff filled in. */
export function WhereToSubmit({ s }: { s: Submission }) {
  const online = s.submission_method === "online";
  const lead =
    online && s.submission_url ? (
      <>
        Online at <External href={s.submission_url}>{shortUrl(s.submission_url)}</External>
      </>
    ) : (
      submissionSummary(s)
    );
  const maps = s.submission_address && !s.is_sample
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.submission_place, s.submission_address].filter(Boolean).join(", "))}`
    : null;
  const rows = (
    [
      // Online: the place is the portal's name, if staff gave one.
      online && s.submission_place ? ["Where", s.submission_place] : null,
      s.submission_address
        ? [
            "Address",
            <>
              <span className="block">{s.submission_address}</span>
              {maps ? <External href={maps}>Open in Maps</External> : null}
            </>,
          ]
        : null,
      s.submission_hours ? ["Office hours", s.submission_hours] : null,
      // Not "Online": for in-person or by-mail listings the link is a website, not where to submit.
      !online && s.submission_url ? ["Website", <External key="url" href={s.submission_url}>{shortUrl(s.submission_url)}</External>] : null,
      s.submission_note ? ["Note", s.submission_note] : null,
    ] as Array<[string, React.ReactNode] | null>
  ).filter((r): r is [string, React.ReactNode] => r !== null);

  if (!lead && !rows.length) {
    return (
      <div>
        <p className="text-ink-secondary">Confirm with the provider where to submit.</p>
        {s.source_url ? <External href={s.source_url}>Check the official source</External> : null}
      </div>
    );
  }
  return (
    <div data-testid="where-to-submit">
      {lead ? <p className="font-semibold text-ink" data-testid="submit-lead">{lead}</p> : null}
      {rows.length ? (
        <dl className={`grid gap-x-6 gap-y-3 text-base sm:grid-cols-[170px_minmax(0,1fr)] ${lead ? "mt-3" : ""}`}>
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-ink-hint">{label}</dt>
              <dd className="max-sm:-mt-2 max-sm:mb-1">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
