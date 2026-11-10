import { describe, expect, it } from "vitest";
import { answerParts, parseKeywords } from "./faq";

describe("answerParts", () => {
  it("turns [text](/path) and https links into link parts", () => {
    expect(answerParts("See [My profile](/profile#reminders) or [CHED](https://ched.gov.ph).")).toEqual([
      "See ",
      { text: "My profile", href: "/profile#reminders" },
      " or ",
      { text: "CHED", href: "https://ched.gov.ph" },
      ".",
    ]);
  });
  it("leaves unsafe or protocol-relative links as text", () => {
    for (const s of ["[x](javascript:alert(1))", "[x](//evil.example)", "[x](http://plain.example)", "[x](data:text/html,hi)"]) {
      expect(answerParts(s)).toEqual([s]);
    }
  });
  it("keeps plain text whole", () => {
    expect(answerParts("No links here.")).toEqual(["No links here."]);
    expect(answerParts("")).toEqual([]);
  });
});

describe("parseKeywords", () => {
  it("splits on commas, trims, lowercases and dedupes", () => {
    expect(parseKeywords("grades, Average , ,grado, grades")).toEqual(["grades", "average", "grado"]);
  });
});
