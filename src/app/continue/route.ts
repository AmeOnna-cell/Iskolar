import { NextResponse, type NextRequest } from "next/server";
import { NEXT_COOKIE, safeNextPath } from "@/lib/auth/routes";

// "Continue to …" after onboarding: go where the new account was headed, once (the cookie is
// cleared), else the dashboard. The target page does its own access check.
export function GET(request: NextRequest) {
  const to = safeNextPath(request.cookies.get(NEXT_COOKIE)?.value, "/dashboard");
  const res = NextResponse.redirect(new URL(to, request.url));
  res.cookies.delete(NEXT_COOKIE);
  return res;
}
