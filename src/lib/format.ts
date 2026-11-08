// Formatting shared by every student screen. Deadlines are calendar dates in Philippine time.

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
export const ord = (n: number) => `${n}${(["th", "st", "nd", "rd"] as const)[n] ?? "th"}`;
export const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

/** Today's date in Asia/Manila as YYYY-MM-DD. */
export function todayPH(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
};

/** "2026-11-07" → "Nov 7" (or with year: "Nov 7, 2026"). */
export function formatDate(iso: string, withYear = false): string {
  return parse(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

export function longDate(iso: string): string {
  return parse(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parse(toIso).getTime() - parse(fromIso).getTime()) / 86_400_000);
}

/** "Today", "Yesterday", "3d ago", or a date. For timestamps (published, replied). */
export function ago(timestamp: string, now = new Date()): string {
  const day = new Date(timestamp).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const n = daysBetween(day, todayPH(now));
  if (n <= 0) return "Today";
  if (n === 1) return "Yesterday";
  if (n < 30) return `${n}d ago`;
  return formatDate(day);
}

/**
 * Weekdays (Mon–Fri, Philippine time) that have fully passed since `timestamp`, not counting its own day.
 * ponytail: ignores PH holidays; add a holiday list if the reply target needs to be exact.
 */
export function schoolDaysSince(timestamp: string, now = new Date()): number {
  const start = parse(new Date(timestamp).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }));
  const end = parse(todayPH(now));
  let n = 0;
  for (let d = new Date(start.getTime() + 86_400_000); d < end; d = new Date(d.getTime() + 86_400_000)) {
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) n++;
  }
  return n;
}

export type ListingStatus = "open" | "upcoming" | "closed";
export type Urgency = "urgent" | "soon" | "none";

/** The Urgency Ladder (DESIGN.md): open and ≤3 days red, ≤7 amber, otherwise neutral. */
export function urgency(status: string, daysLeft: number | null): Urgency {
  if (status !== "open" || daysLeft === null) return "none";
  if (daysLeft <= 3) return "urgent";
  if (daysLeft <= 7) return "soon";
  return "none";
}

/** "Closes in 4 days" / "Closes today" / "Opens Nov 15" / "Closed Oct 24" (prototype dueText). */
export function dueText(s: { status: string; days_left: number | null; opens_on: string | null; closes_on: string | null }): string {
  if (s.status === "open") {
    if (s.days_left === null) return "Open";
    return s.days_left === 0 ? "Closes today" : `Closes in ${plural(s.days_left, "day")}`;
  }
  if (s.status === "upcoming") return s.opens_on ? `Opens ${formatDate(s.opens_on)}` : "Opening soon";
  return s.closes_on ? `Closed ${formatDate(s.closes_on)}` : "Closed";
}

/** Prototype shortProv: provider name without the parenthetical. */
export const shortProvider = (name: string) => name.replace(/ \(.*\)$/, "");
