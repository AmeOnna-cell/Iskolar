import "server-only";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  status: "active" | "deactivated" | "deleted";
  fullName: string | null;
};

/**
 * The signed-in user, verified with Supabase Auth (getUser), with role and status read from
 * profiles, never from the JWT alone. Cached per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;
  return {
    id: user.id,
    email: profile.email ?? user.email ?? "",
    role: profile.role,
    status: profile.status,
    fullName: profile.full_name,
  };
});

export function homeFor(role: Role): string {
  return role === "student" ? "/dashboard" : "/staff";
}

/**
 * Layer 2 of 4. Call at the top of every protected layout, page, server action and route handler.
 * Signed out → /login. Deactivated or deleted → signed out with a message. Wrong role → 403.
 * With no roles given, any active signed-in user passes.
 */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // Signed out by a Route Handler: Server Components can't clear the session cookies.
  if (user.status !== "active") redirect("/auth/signed-out");
  if (roles.length > 0 && !roles.includes(user.role)) forbidden();
  return user;
}
