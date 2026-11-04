// Dashboard priorities (brief §4.12), as pure functions so the order is testable.
import { plural } from "./format";

export type TrackedItem = {
  scholarshipId: string;
  slug: string;
  name: string;
  providerName: string;
  stage: "saved" | "preparing" | "submitted";
  result: "pending" | "approved" | "rejected";
  status: "open" | "upcoming" | "closed";
  daysLeft: number | null;
  daysToOpen: number | null;
  closesOn: string | null;
  opensOn: string | null;
  verified: boolean;
  docsTotal: number;
  docsDone: number;
  firstMissingDoc: string | null;
};

/** A row of "Do this next": one deadline, question or check, with its single next action. */
export type NextRow = {
  key: string;
  title: string;
  detail: string;
  /** Shown as a date chip and a deadline coloured by the urgency ladder (deadline rows only). */
  due: { status: "open" | "upcoming" | "closed"; days_left: number | null; opens_on: string | null; closes_on: string | null } | null;
  action: { label: string; href?: string; stage?: "saved" | "preparing" | "submitted"; scholarshipId?: string };
  rank: number;
};

export type MatchLite = {
  id: string;
  slug: string;
  name: string;
  status: "open" | "upcoming" | "closed";
  daysLeft: number | null;
  opensOn: string | null;
  closesOn: string | null;
  sample: boolean;
  verified: boolean;
};

const lcFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0]!.toLowerCase() + s.slice(1) : s);
const docsLeft = (t: TrackedItem) => t.docsTotal - t.docsDone;
const inProgress = (t: TrackedItem) => (t.stage === "saved" || t.stage === "preparing") && t.status !== "closed";

/** Tracked, still open, closing within the week, not yet submitted: what the greeting talks about. */
export function urgentItems(items: TrackedItem[], withinDays = 7): TrackedItem[] {
  return items
    .filter((t) => inProgress(t) && t.status === "open" && t.daysLeft !== null && t.daysLeft <= withinDays)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
}

const when = (status: string, daysLeft: number | null, daysToOpen: number | null) =>
  status === "open" ? (daysLeft === 0 ? "closes today" : `closes in ${plural(daysLeft ?? 0, "day")}`) : `opens in ${plural(daysToOpen ?? 0, "day")}`;
const trust = (m: MatchLite) => (m.sample ? "Sample listing: check the official source first." : m.verified ? "" : "Not verified yet: confirm with the provider first.");

/**
 * "Do this next" (brief §4.12): every deadline, question and check in one list, soonest deadline first.
 * Each scholarship appears once, with its next missing document inline. Matches the student
 * qualifies for but hasn't saved are included when they close within `withinDays`.
 */
export function doNext(
  items: TrackedItem[],
  qualifying: MatchLite[],
  maybe: Array<{ slug: string; name: string; question: string; step: number }>,
  withinDays = 7,
): NextRow[] {
  const rows: NextRow[] = [];
  for (const t of items.filter(inProgress)) {
    const due = { status: t.status, days_left: t.daysLeft, opens_on: t.opensOn, closes_on: t.closesOn };
    const rank = t.status === "open" ? (t.daysLeft ?? 999) : 1000 + (t.daysToOpen ?? 0);
    const left = docsLeft(t);
    if (t.stage === "saved") {
      rows.push({ key: `start-${t.slug}`, title: t.name, detail: "Saved, not started yet.", due, rank,
        action: { label: "Start preparing", stage: "preparing", scholarshipId: t.scholarshipId } });
    } else if (left > 0) {
      const next = lcFirst((t.firstMissingDoc ?? "documents").split(":")[0]!);
      rows.push({ key: `docs-${t.slug}`, title: t.name, detail: `Next: get your ${next}. ${plural(left, "document")} missing.`, due, rank,
        action: { label: "View checklist", href: `/s/${t.slug}#documents-${t.slug}` } });
    } else {
      rows.push({ key: `submit-${t.slug}`, title: t.name, detail: "All documents are ready to submit.", due, rank,
        action: { label: "Mark as submitted", stage: "submitted", scholarshipId: t.scholarshipId } });
    }
  }
  const tracked = new Set(items.map((t) => t.slug));
  for (const m of qualifying.filter((q) => !tracked.has(q.slug) && q.status === "open")) {
    const soon = m.daysLeft !== null && m.daysLeft <= withinDays;
    if (soon) {
      rows.push({
        key: `save-${m.slug}`,
        title: m.name,
        detail: `You qualify and haven't saved it yet. ${trust(m)}`.trim(),
        due: { status: m.status, days_left: m.daysLeft, opens_on: m.opensOn, closes_on: m.closesOn },
        action: { label: "Save", stage: "saved", scholarshipId: m.id },
        rank: m.daysLeft ?? 999,
      });
    } else if (m.sample || !m.verified) {
      // After every deadline: checking a source matters less than documents that are due.
      rows.push({
        key: `confirm-${m.slug}`,
        title: `Confirm ${m.name} with the provider`,
        detail: `You qualify. It ${when(m.status, m.daysLeft, null)}. ${trust(m).replace(/:.*$/, ".")}`,
        due: null,
        action: { label: "Check the source", href: `/s/${m.slug}` },
        rank: 600 + (m.daysLeft ?? 0),
      });
    }
  }
  for (const m of maybe) {
    rows.push({ key: `answer-${m.slug}`, title: `Answer 1 question to check ${m.name}`, detail: `${m.question}.`, due: null, rank: 500,
      action: { label: "Answer now", href: `/check?step=${m.step}` } });
  }
  return rows.sort((a, b) => a.rank - b.rank);
}

/** The greeting's one fact and the page's one primary action. */
export function headline(input: { hasProfile: boolean; urgent: TrackedItem[]; qualifyCount: number }): {
  fact: string;
  action: { label: string; href: string };
} {
  if (!input.hasProfile) {
    return {
      fact: "Answer a few questions to see which scholarships you qualify for.",
      action: { label: "Check my eligibility", href: "/check" },
    };
  }
  const top = input.urgent[0];
  if (top) {
    const left = docsLeft(top);
    const closes = top.daysLeft === 0 ? "closes today" : `closes in ${plural(top.daysLeft ?? 0, "day")}`;
    return left > 0
      ? { fact: `${top.name} ${closes} and ${plural(left, "document")} ${left === 1 ? "is" : "are"} still missing.`, action: { label: "Open the checklist", href: `/s/${top.slug}#documents-${top.slug}` } }
      : { fact: `${top.name} ${closes}. All documents are ready to submit.`, action: { label: "Submit it now", href: `/s/${top.slug}` } };
  }
  if (input.qualifyCount > 0) {
    return {
      fact: `You qualify for ${plural(input.qualifyCount, "open or upcoming scholarship")}. Nothing you track closes this week.`,
      action: { label: "See what I qualify for", href: "/explore?mine=1&sort=match" },
    };
  }
  return { fact: "Nothing you track closes this week.", action: { label: "Find scholarships", href: "/explore" } };
}

export const PROFILE_FIELDS: Array<[key: string, label: string, step: number]> = [
  ["field", "Course area", 1],
  ["year_level", "Year level", 1],
  ["gwa", "GWA", 2],
  ["income_bracket", "Household income", 3],
  ["four_ps", "4Ps or Listahanan", 3],
  ["ofw", "OFW parent", 3],
  ["region", "Home region", 4],
];

export function completeness(sp: Record<string, unknown> | null) {
  const missing = PROFILE_FIELDS.filter(([k]) => sp?.[k] === null || sp?.[k] === undefined);
  return { pct: Math.round(((PROFILE_FIELDS.length - missing.length) / PROFILE_FIELDS.length) * 100), missing };
}
