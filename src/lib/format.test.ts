import { describe, expect, it } from "vitest";
import { schoolDaysSince, splitAmount } from "./format";

// Noon PH time (04:00 UTC) on the given date.
const at = (iso: string) => new Date(`${iso}T04:00:00Z`);

describe("schoolDaysSince", () => {
  it("counts full weekdays between the day asked and today", () => {
    expect(schoolDaysSince(at("2026-11-02").toISOString(), at("2026-11-02"))).toBe(0); // same day (Mon)
    expect(schoolDaysSince(at("2026-11-02").toISOString(), at("2026-11-04"))).toBe(1); // Tue passed
    expect(schoolDaysSince(at("2026-11-02").toISOString(), at("2026-11-05"))).toBe(2); // Tue, Wed
  });
  it("skips weekends", () => {
    // Asked Friday; Monday is the first school day, so on Tuesday one has passed, on Wednesday two.
    expect(schoolDaysSince(at("2026-11-06").toISOString(), at("2026-11-10"))).toBe(1);
    expect(schoolDaysSince(at("2026-11-06").toISOString(), at("2026-11-11"))).toBe(2);
  });
  it("uses the Philippine date, not UTC", () => {
    // 23:30 UTC Sunday is 07:30 Monday in Manila.
    expect(schoolDaysSince("2026-11-01T23:30:00Z", at("2026-11-04"))).toBe(1);
  });
});

describe("splitAmount", () => {
  it("splits the figure from its period for the card's large amount", () => {
    expect(splitAmount("₱5,000 a semester")).toEqual({ main: "₱5,000", period: "per semester" });
    expect(splitAmount("Up to ₱120,000 a year")).toEqual({ main: "Up to ₱120,000", period: "per year" });
    expect(splitAmount("Full tuition and ₱7,000 a month")).toEqual({ main: "Full tuition and ₱7,000", period: "per month" });
  });
  it("leaves text without a period whole", () => {
    expect(splitAmount("50% to 100% tuition discount")).toEqual({ main: "50% to 100% tuition discount", period: null });
  });
});
