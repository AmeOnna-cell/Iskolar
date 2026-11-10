// Route access rules, shared by middleware (layer 1) and tested in isolation.
import type { Role } from "@/lib/nav";

export type Access =
  | { kind: "public" }
  /** Sign-in pages: signed-in users are sent to their home instead. */
  | { kind: "guest-only" }
  | { kind: "signed-in" }
  | { kind: "roles"; roles: Role[] };

const RULES: Array<[prefix: string, access: Access]> = [
  ["/login", { kind: "guest-only" }],
  ["/signup", { kind: "guest-only" }],
  ["/forgot-password", { kind: "guest-only" }],
  ["/check-email", { kind: "guest-only" }],
  ["/auth/update-password", { kind: "signed-in" }],
  ["/dashboard", { kind: "roles", roles: ["student"] }],
  ["/applications", { kind: "roles", roles: ["student"] }],
  ["/alerts", { kind: "roles", roles: ["student"] }],
  ["/check", { kind: "roles", roles: ["student"] }],
  // Signed-in only (team-leader revision, 2026-11-11; it was public before).
  ["/announcements", { kind: "signed-in" }],
  ["/settings", { kind: "signed-in" }],
  ["/profile", { kind: "signed-in" }],
  ["/staff", { kind: "roles", roles: ["coordinator", "admin"] }],
  ["/admin", { kind: "roles", roles: ["admin"] }],
];

export function accessFor(pathname: string): Access {
  for (const [prefix, access] of RULES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return access;
  }
  return { kind: "public" };
}

/**
 * Where `next` may send someone after signing in: a same-origin path only. Rejects absolute URLs,
 * protocol-relative "//evil.com", backslash tricks and control characters (open-redirect defence).
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || typeof next !== "string" || next.length > 512) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(next)) return fallback;
  try {
    const url = new URL(next, "http://iskolar.local");
    if (url.origin !== "http://iskolar.local") return fallback;
    // Never bounce back into the sign-in pages.
    if (accessFor(url.pathname).kind === "guest-only") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

/** Cookie holding where a new account was headed, set when the email is confirmed (auth/confirm)
 * and used once onboarding is done or skipped (/continue). */
export const NEXT_COOKIE = "iskolar_next";

/** What a ?next= path leads to, in words: the sign-in notice and "Continue to …" after onboarding. */
export function destinationOf(path: string | null | undefined): { name: string; purpose: string } | null {
  const p = (path ?? "").split(/[?#]/)[0] ?? "";
  const is = (prefix: string) => p === prefix || p.startsWith(prefix + "/");
  if (is("/announcements")) return { name: "Announcements", purpose: "read announcements" };
  if (is("/applications")) return { name: "My applications", purpose: "track your applications" };
  if (is("/check")) return { name: "the eligibility check", purpose: "check your eligibility" };
  if (p.startsWith("/s/")) return { name: "the scholarship", purpose: "save and track this scholarship" };
  if (is("/help")) return { name: "Help", purpose: "ask the scholarship office" };
  return null;
}
