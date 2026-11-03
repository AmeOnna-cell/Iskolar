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
    expect(primaryNav(null)).toHaveLength(5);
  });
});
