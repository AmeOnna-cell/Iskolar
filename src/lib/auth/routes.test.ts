import { describe, expect, it } from "vitest";
import { accessFor, safeNextPath } from "./routes";

describe("accessFor", () => {
  it("classifies routes by group", () => {
    expect(accessFor("/")).toEqual({ kind: "public" });
    expect(accessFor("/explore")).toEqual({ kind: "public" });
    expect(accessFor("/s/tulong-dunong-program")).toEqual({ kind: "public" });
    expect(accessFor("/login")).toEqual({ kind: "guest-only" });
    expect(accessFor("/dashboard")).toEqual({ kind: "roles", roles: ["student"] });
    expect(accessFor("/staff/listings")).toEqual({ kind: "roles", roles: ["coordinator", "admin"] });
    expect(accessFor("/admin/audit")).toEqual({ kind: "roles", roles: ["admin"] });
    expect(accessFor("/administrator")).toEqual({ kind: "public" });
    // Visitors are sent to sign in for these three (and come back after).
    expect(accessFor("/check")).toEqual({ kind: "roles", roles: ["student"] });
    expect(accessFor("/applications")).toEqual({ kind: "roles", roles: ["student"] });
    expect(accessFor("/announcements")).toEqual({ kind: "signed-in" });
    expect(accessFor("/help")).toEqual({ kind: "public" });
  });
});

describe("safeNextPath", () => {
  it("keeps same-origin paths with their query", () => {
    expect(safeNextPath("/applications?tab=preparing")).toBe("/applications?tab=preparing");
    expect(safeNextPath("/s/tdp#documents")).toBe("/s/tdp#documents");
  });

  it("rejects anything that could leave the site", () => {
    for (const bad of [
      "https://evil.example.com",
      "//evil.example.com",
      "/\\evil.example.com",
      "\\\\evil.example.com",
      "javascript:alert(1)",
      "/\u0000",
      "/\r\nSet-Cookie:x",
      "dashboard",
      "",
      null,
      undefined,
    ]) {
      expect(safeNextPath(bad as string, "/fallback")).toBe("/fallback");
    }
  });

  it("keeps percent-encoded characters encoded (they stay inside the path)", () => {
    expect(safeNextPath("/%0d%0aSet-Cookie:x")).toBe("/%0d%0aSet-Cookie:x");
  });

  it("never returns to the sign-in pages", () => {
    expect(safeNextPath("/login?next=/x", "/dashboard")).toBe("/dashboard");
  });
});
