import { describe, expect, it } from "vitest";
import { haveText, reasonLine, requirementLabel, stepFor, verdictSentence, type EligibilityItem } from "./eligibility";
import { dueText, urgency } from "./format";

describe("eligibility wording (prototype)", () => {
  it("labels each requirement", () => {
    expect(requirementLabel({ kind: "gwa", status: "met", required: 2, have: 1.85 })).toBe("GWA of 2.00 or better");
    expect(requirementLabel({ kind: "year", status: "met", required: [2, 3], have: 2 })).toBe("2nd or 3rd year student");
    expect(
      requirementLabel({ kind: "field", status: "met", required: ["science_math", "engineering", "it_cs", "agriculture_fisheries"], have: "science_math" }),
    ).toBe("Taking a science, math, engineering, IT or agriculture course");
    expect(requirementLabel({ kind: "field", status: "not_met", required: ["engineering", "it_cs"], have: "science_math" })).toBe(
      "Taking a course in Engineering or IT & Computer Science",
    );
    expect(requirementLabel({ kind: "income", status: "met", required: 400000, have: "150k_250k" })).toBe(
      "Household income of ₱400,000 a year or less",
    );
    expect(requirementLabel({ kind: "region", status: "met", required: ["central_luzon"], have: "central_luzon" })).toBe(
      "Lives in Region III – Central Luzon",
    );
  });

  it("explains what the student said, keeping 'not sure' apart from 'not answered'", () => {
    expect(haveText({ kind: "four_ps", status: "unknown", required: true, have: null })).toBe("You haven’t answered this yet");
    expect(haveText({ kind: "four_ps", status: "unknown", required: true, have: "unsure" })).toBe(
      "You weren’t sure. Ask your barangay or DSWD office.",
    );
    expect(haveText({ kind: "income", status: "met", required: 400000, have: "150k_250k" })).toBe("You said ₱150,000 to ₱250,000");
    expect(haveText({ kind: "income", status: "unknown", required: 200000, have: "150k_250k" })).toContain("may be under or over");
    expect(haveText({ kind: "income", status: "unknown", required: 200000, have: null, answered: true })).toBe(
      "You weren’t sure of your household income",
    );
    expect(haveText({ kind: "ofw", status: "met", required: true, have: true })).toBe("You said a parent is an OFW");
  });

  it("builds the verdict banner and reason lines", () => {
    expect(verdictSentence({ verdict: "yes", met: 2, unknown: 0, not_met: 0, total: 2 })).toBe("You meet both requirements we can check");
    expect(verdictSentence({ verdict: "maybe", met: 0, unknown: 1, not_met: 0, total: 1 })).toBe("You meet 0 of 1. One answer is missing.");
    expect(verdictSentence({ verdict: "no", met: 1, unknown: 0, not_met: 1, total: 2 })).toBe("You don’t meet 1 requirement");
    const gwa: EligibilityItem = { kind: "gwa", status: "not_met", required: 1.5, have: 1.85 };
    // Acronyms keep their case ("GWA"); ordinary first words are lowercased ("household …").
    expect(reasonLine(gwa)).toBe("Requires GWA of 1.50 or better. Your GWA is 1.85.");
    expect(reasonLine({ kind: "four_ps", status: "unknown", required: true, have: null })).toBe(
      "Missing answer: household is in 4Ps or the DSWD Listahanan.",
    );
    expect(stepFor(gwa)).toBe(2);
  });
});

describe("deadlines", () => {
  it("follows the urgency ladder", () => {
    expect(urgency("open", 2)).toBe("urgent");
    expect(urgency("open", 7)).toBe("soon");
    expect(urgency("open", 8)).toBe("none");
    expect(urgency("upcoming", 1)).toBe("none");
  });

  it("writes due text", () => {
    expect(dueText({ status: "open", days_left: 0, opens_on: null, closes_on: "2026-11-03" })).toBe("Closes today");
    expect(dueText({ status: "open", days_left: 1, opens_on: null, closes_on: "2026-11-04" })).toBe("Closes in 1 day");
    expect(dueText({ status: "upcoming", days_left: 45, opens_on: "2026-11-15", closes_on: null })).toBe("Opens Nov 15");
    expect(dueText({ status: "closed", days_left: -10, opens_on: null, closes_on: "2026-10-24" })).toBe("Closed Oct 24");
  });
});
