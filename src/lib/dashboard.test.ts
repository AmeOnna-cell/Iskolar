import { describe, expect, it } from "vitest";
import { completeness, headline, nextSteps, urgentItems, type TrackedItem } from "./dashboard";

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

  it("next steps follow the prototype and sort by urgency", () => {
    const steps = nextSteps([tdp, odsp, done], [{ slug: "tes", name: "TES", question: "Household is in 4Ps", step: 3 }], []);
    expect(steps.map((s) => s.title)).toEqual([
      "Submit City Assistance",
      "Get your proof of income",
      "Start preparing OFW Dependents",
      "Answer 1 question to check TES",
    ]);
    expect(steps[0]!.tone).toBe("urgent");
    expect(steps[2]!.action).toEqual({ label: "Start preparing", stage: "preparing", scholarshipId: "id" });
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
