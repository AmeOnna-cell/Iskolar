import { describe, expect, it } from "vitest";
import { completeness, doNext, headline, urgentItems, type MatchLite, type TrackedItem } from "./dashboard";

const base: TrackedItem = {
  scholarshipId: "id",
  slug: "s",
  name: "S",
  providerName: "P",
  stage: "preparing",
  result: "pending",
  status: "open",
  daysLeft: 10,
  daysToOpen: null,
  closesOn: "2026-11-13",
  opensOn: null,
  verified: true,
  docsTotal: 5,
  docsDone: 2,
  firstMissingDoc: "Proof of income: parents’ ITR",
};
const item = (p: Partial<TrackedItem>): TrackedItem => ({ ...base, ...p });

describe("dashboard priorities", () => {
  const tdp = item({ slug: "tdp", name: "Tulong Dunong Program", daysLeft: 4 });
  const odsp = item({ slug: "odsp", name: "OFW Dependents", stage: "saved", daysLeft: 9, docsDone: 0 });
  const done = item({ slug: "lgu", name: "City Assistance", daysLeft: 2, docsTotal: 3, docsDone: 3 });
  const sent = item({ slug: "tes", name: "TES", stage: "submitted", daysLeft: 1 });

  it("urgent = tracked, open, within 7 days, not submitted, soonest first", () => {
    expect(urgentItems([tdp, odsp, done, sent]).map((t) => t.slug)).toEqual(["lgu", "tdp"]);
  });

  it("do this next: one row per scholarship, soonest deadline first, next document inline", () => {
    const match = (p: Partial<MatchLite>): MatchLite => ({
      id: "m", slug: "m", name: "M", status: "open", daysLeft: 20, opensOn: null, closesOn: "2026-11-30", sample: false, verified: true, ...p,
    });
    const cityEd = match({ slug: "city", name: "City Educational Assistance", daysLeft: 1, sample: true });
    const dost = match({ slug: "dost", name: "DOST-SEI", daysLeft: 40, verified: false });
    const rows = doNext([tdp, odsp, done], [cityEd, dost, match({ slug: "tdp", name: "Tulong Dunong Program", daysLeft: 4 })], [
      { slug: "tes", name: "TES", question: "Household is in 4Ps", step: 3 },
    ]);
    expect(rows.map((r) => r.key)).toEqual(["save-city", "submit-lgu", "docs-tdp", "start-odsp", "answer-tes", "confirm-dost"]);
    // A qualifying listing closing soon but not saved yet is a deadline row with a Save action.
    expect(rows[0]).toMatchObject({ title: "City Educational Assistance", action: { label: "Save", stage: "saved" } });
    expect(rows[0]!.detail).toBe("You qualify and haven't saved it yet. Sample listing: check the official source first.");
    // Tracked rows carry their next missing document; the same scholarship is never listed twice.
    expect(rows[2]).toMatchObject({ title: "Tulong Dunong Program", detail: "Next: get your proof of income. 3 documents missing." });
    expect(rows.filter((r) => r.title.includes("Tulong Dunong"))).toHaveLength(1);
    // Checking a source ranks after every deadline and question.
    expect(rows.at(-1)).toMatchObject({ title: "Confirm DOST-SEI with the provider", action: { label: "Check the source", href: "/s/dost" } });
  });

  it("the greeting states the most urgent fact and one action", () => {
    expect(headline({ hasProfile: false, urgent: [], qualifyCount: 0 }).action.href).toBe("/check");
    expect(headline({ hasProfile: true, urgent: [tdp], qualifyCount: 4 }).fact).toBe(
      "Tulong Dunong Program closes in 4 days and 3 documents are still missing.",
    );
    expect(headline({ hasProfile: true, urgent: [], qualifyCount: 4 }).fact).toBe(
      "You qualify for 4 open or upcoming scholarships. Nothing you track closes this week.",
    );
  });

  it("profile completeness counts answered fields (false and 'unsure' count as answered)", () => {
    expect(completeness({ field: "it_cs", year_level: 2, gwa: null, income_bracket: null, four_ps: "unsure", ofw: false, region: null }).pct).toBe(57);
    expect(completeness(null).missing).toHaveLength(7);
  });
});
