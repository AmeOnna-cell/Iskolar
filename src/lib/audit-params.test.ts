import { describe, expect, it } from "vitest";
import { csvCell, parseAuditParams } from "./audit-params";

describe("audit params", () => {
  it("parses a valid keyset cursor and rejects junk", () => {
    expect(parseAuditParams({ before: "2026-11-03T05:00:00.000Z|42" }).before).toEqual({ at: "2026-11-03T05:00:00.000Z", id: 42 });
    expect(parseAuditParams({ before: "nope|x" }).before).toBeNull();
    expect(parseAuditParams({ from: "2026-11-01", to: "not-a-date" })).toMatchObject({ from: "2026-11-01", to: "" });
    expect(parseAuditParams({ action: "scholarship.publish');drop" }).action).toBe("scholarship.publishdrop");
  });

  it("escapes CSV cells and neutralises formulas", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell({ a: 1 })).toBe('"{""a"":1}"');
    expect(csvCell(null)).toBe('""');
  });
});
