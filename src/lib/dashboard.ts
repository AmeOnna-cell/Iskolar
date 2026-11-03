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

export type Task = {
  key: string;
  tone: "urgent" | "warn" | "info";
  icon: "brief" | "doc" | "yes" | "q" | "warn";
  title: string;
  detail: string;
  action: { label: string; href?: string; stage?: "preparing" | "submitted"; scholarshipId?: string };
  rank: number;
};

const lcFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0]!.toLowerCase() + s.slice(1) : s);
const docsLeft = (t: TrackedItem) => t.docsTotal - t.docsDone;
const inProgress = (t: TrackedItem) => (t.stage === "saved" || t.stage === "preparing") && t.status !== "closed";

/** Tracked, still open, closing within the week, not yet submitted: the block that leads the page. */
export function urgentItems(items: TrackedItem[], withinDays = 7): TrackedItem[] {
  return items
    .filter((t) => inProgress(t) && t.status === "open" && t.daysLeft !== null && t.daysLeft <= withinDays)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
}

const toneFor = (t: TrackedItem): Task["tone"] =>
  t.status === "open" && (t.daysLeft ?? 99) <= 3 ? "urgent" : t.status === "open" && (t.daysLeft ?? 99) <= 7 ? "warn" : "info";
const when = (t: TrackedItem) => (t.status === "open" ? `closes in ${plural(t.daysLeft ?? 0, "day")}` : `opens in ${plural(t.daysToOpen ?? 0, "day")}`);

/** Next steps, generated from the data (prototype "To do"), most urgent first. */
export function nextSteps(
  items: TrackedItem[],
  maybe: Array<{ slug: string; name: string; question: string; step: number }>,
  unverifiedMatches: Array<{ slug: string; name: string; daysLeft: number | null }>,
  max = 5,
): Task[] {
  const tasks: Task[] = [];
  for (const t of items.filter(inProgress)) {
    const rank = t.status === "open" ? (t.daysLeft ?? 999) : 1000 + (t.daysToOpen ?? 0);
    if (t.stage === "saved") {
      tasks.push({
        key: `start-${t.slug}`,
        tone: toneFor(t),
        icon: "brief",
        title: `Start preparing ${t.name}`,
        detail: `Saved but not started. It ${when(t)}.`,
        action: { label: "Start preparing", stage: "preparing", scholarshipId: t.scholarshipId },
        rank,
      });
    } else if (docsLeft(t) > 0) {
      tasks.push({
        key: `docs-${t.slug}`,
        tone: toneFor(t),
        icon: "doc",
        title: `Get your ${lcFirst((t.firstMissingDoc ?? "documents").split(":")[0]!)}`,
        detail: `For ${t.name}. ${plural(docsLeft(t), "document")} left, ${when(t)}.`,
        action: { label: "View checklist", href: `/s/${t.slug}#documents-${t.slug}` },
        rank,
      });
    } else {
      tasks.push({
        key: `submit-${t.slug}`,
        tone: toneFor(t),
        icon: "yes",
        title: `Submit ${t.name}`,
        detail: "All documents are ready.",
        action: { label: "Mark as submitted", stage: "submitted", scholarshipId: t.scholarshipId },
        rank,
      });
    }
  }
  for (const m of maybe) {
    tasks.push({
      key: `answer-${m.slug}`,
      tone: "info",
      icon: "q",
      title: `Answer 1 question to check ${m.name}`,
      detail: `${m.question}.`,
      action: { label: "Answer", href: `/check?step=${m.step}` },
      rank: 500,
    });
  }
  for (const u of unverifiedMatches) {
    tasks.push({
      key: `confirm-${u.slug}`,
      tone: "warn",
      icon: "warn",
      title: `Confirm ${u.name} with the provider`,
      detail: "This listing isn’t verified yet.",
      action: { label: "View", href: `/s/${u.slug}` },
      rank: u.daysLeft ?? 600,
    });
  }
  return tasks.sort((a, b) => a.rank - b.rank).slice(0, max);
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
