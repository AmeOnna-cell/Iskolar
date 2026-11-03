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
  ["/settings", { kind: "signed-in" }],
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
