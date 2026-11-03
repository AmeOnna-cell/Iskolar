import { describe, expect, it } from "vitest";
import {
  announcementEmail,
  appLink,
  deadlineChangedEmail,
  deadlineReminderEmail,
  formatDate,
  newMatchEmail,
} from "./templates.ts";

const appUrl = "https://iskolar.example.com";
const prefs = "https://iskolar.example.com/settings/notifications";

function expectShared(email: { subject: string; html: string; text: string }) {
  expect(email.subject).not.toMatch(/[\r\n]/);
  expect(email.html).toContain(`href="${prefs}"`);
  expect(email.html).toContain("Manage email preferences");
  expect(email.html).toContain('name="viewport"');
  expect(email.text).toContain(`Manage email preferences: ${prefs}`);
  expect(email.text).not.toMatch(/<[a-z]/i);
}

describe("deadline reminder", () => {
  const base = {
    appUrl,
    studentName: "Ana Reyes",
    scholarshipName: "Tulong Dunong Program",
    providerName: "CHED",
    closesOn: "2026-11-07",
    daysLeft: 4,
    documentsLeft: 3,
    documentsTotal: 5,
    scholarshipPath: "/s/tdp",
  };

  it("says how long is left and what is still missing", () => {
    const email = deadlineReminderEmail(base);
    expect(email.subject).toBe("Tulong Dunong Program closes in 4 days");
    expect(email.text).toContain("Hi Ana,");
    expect(email.text).toContain("on Sat, Nov 7, 2026");
    expect(email.text).toContain("You still have 3 of 5 documents to prepare.");
    expect(email.text).toContain("Open my checklist: https://iskolar.example.com/s/tdp");
    // Urgency Ladder: 4 days is amber, ≤3 days is red.
    expect(email.html).toContain("#FFF3D9");
    expect(deadlineReminderEmail({ ...base, daysLeft: 2 }).html).toContain("#FDECEA");
    expectShared(email);
  });

  it("handles today, tomorrow and all-documents-ready", () => {
    expect(deadlineReminderEmail({ ...base, daysLeft: 0 }).subject).toBe("Tulong Dunong Program closes today");
    expect(deadlineReminderEmail({ ...base, daysLeft: 1 }).subject).toBe("Tulong Dunong Program closes tomorrow");
    const ready = deadlineReminderEmail({ ...base, documentsLeft: 0, studentName: null });
    expect(ready.text).toContain("All 5 documents are ready.");
    expect(ready.text).toContain("Hi,");
  });
});

describe("deadline changed", () => {
  it("states the new date, the old date and the impact", () => {
    const email = deadlineChangedEmail({
      appUrl,
      scholarshipName: "Tertiary Education Subsidy (TES)",
      providerName: "UniFAST",
      previousClosesOn: "2026-11-21",
      newClosesOn: "2026-11-14",
      scholarshipPath: "/s/tes",
    });
    expect(email.subject).toBe("Deadline moved: Tertiary Education Subsidy (TES) now closes Sat, Nov 14, 2026");
    expect(email.text).toContain("(it was Sat, Nov 21, 2026)");
    expect(email.text).toContain("That's 7 days earlier");
    expectShared(email);
  });
});

describe("new match", () => {
  it("keeps the preliminary-check disclaimer", () => {
    const email = newMatchEmail({
      appUrl,
      studentName: "Ana",
      scholarshipName: "DOST-SEI Junior Level Science Scholarship",
      providerName: "DOST Science Education Institute",
      amount: "Full tuition and ₱7,000 a month",
      verdict: "maybe",
      closesOn: "2026-12-18",
      scholarshipPath: "/s/jlss",
    });
    expect(email.subject).toBe("New scholarship you might qualify for: DOST-SEI Junior Level Science Scholarship");
    expect(email.text).toContain("not an official decision");
    expect(email.html).toContain("Might qualify");
    expectShared(email);
  });
});

describe("announcement", () => {
  it("escapes staff-written content and keeps paragraphs", () => {
    const email = announcementEmail({
      appUrl,
      title: "TDP forms <now> at the registrar",
      body: 'Window 3, weekdays 8 AM to 4 PM.\n\nBring your COR & a "valid" ID.<script>alert(1)</script>',
      from: "City Scholarship Office",
    });
    expect(email.subject).toBe("TDP forms <now> at the registrar");
    expect(email.html).toContain("TDP forms &lt;now&gt; at the registrar");
    expect(email.html).toContain("COR &amp; a &quot;valid&quot; ID.&lt;script&gt;");
    expect(email.html).not.toContain("<script>");
    expect(email.text).toContain("Bring your COR & a \"valid\" ID.");
    expect(email.text).toContain("Posted by City Scholarship Office");
    expectShared({ ...email, text: email.text.replace("<now>", "now").replace("<script>alert(1)</script>", "") });
  });
});

describe("helpers", () => {
  it("only builds same-site links", () => {
    expect(appLink("https://iskolar.example.com/", "/s/tdp")).toBe("https://iskolar.example.com/s/tdp");
    expect(() => appLink(appUrl, "https://evil.example.com")).toThrow();
    expect(() => appLink(appUrl, "//evil.example.com")).toThrow();
  });

  it("formats calendar dates without a time-zone shift", () => {
    expect(formatDate("2026-01-01")).toBe("Thu, Jan 1, 2026");
    expect(() => formatDate("Nov 7")).toThrow();
  });
});
