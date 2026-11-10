import { describe, expect, it } from "vitest";
import { homeHref, isActive, primaryNav } from "./nav";

describe("nav", () => {
  it("marks the right section active", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/explore", "/")).toBe(false);
    expect(isActive("/s/tdp", "/explore")).toBe(true);
    expect(isActive("/check/results", "/check")).toBe(true);
    expect(isActive("/checklist", "/check")).toBe(false);
    expect(isActive("/staff/listings", "/staff")).toBe(false);
  });

  it("gives each role its own home and nav", () => {
    expect(homeHref(null)).toBe("/");
    expect(homeHref({ name: "Ana", email: "a@x.ph", role: "student" })).toBe("/dashboard");
    const coord = primaryNav({ name: null, email: "c@x.ph", role: "coordinator" }).map((i) => i.href);
    expect(coord).not.toContain("/admin/users");
    const admin = primaryNav({ name: null, email: "a@x.ph", role: "admin" }).map((i) => i.href);
    expect(admin).toContain("/admin/users");
    expect(admin).toContain("/staff/faqs");
    // Five tabs on phones for every role: FAQs is reached from Questions there.
    expect(admin.filter((h) => h !== "/staff/faqs")).toHaveLength(5);
    expect(primaryNav({ name: null, email: "a@x.ph", role: "admin" }).filter((i) => i.only !== "wide")).toHaveLength(5);
    // Students: five tabs on phones plus Help (in the header "?" at every width).
    const student = primaryNav({ name: null, email: "s@x.ph", role: "student" }).map((i) => i.href);
    expect(student).toEqual(["/dashboard", "/explore", "/check", "/applications", "/announcements", "/help"]);
    // Visitors: only public pages; no Eligibility check, My applications or Announcements.
    const visitor = primaryNav(null);
    expect(visitor.map((i) => i.href)).toEqual(["/", "/explore", "/help", "/login"]);
    expect(visitor.filter((i) => i.only !== "phone" && i.href !== "/help").map((i) => i.label)).toEqual(["Home", "Find scholarships"]);
    expect(visitor.filter((i) => i.only !== "wide" && i.href !== "/help").map((i) => i.short)).toEqual(["Home", "Search", "Sign in"]);
  });
});
