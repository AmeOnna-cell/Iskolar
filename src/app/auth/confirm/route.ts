import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Email links land here: /auth/confirm?token_hash=…&type=email|recovery|email_change
// (supabase/templates/*.html). Verifying the token hash creates the session on this device.
const TYPES = new Set<EmailOtpType>(["email", "signup", "recovery", "email_change", "invite"]);

const DESTINATION: Partial<Record<EmailOtpType, string>> = {
  email: "/check?welcome=1", // new account: onboarding (eligibility questions), then the dashboard
  signup: "/check?welcome=1",
  invite: "/check?welcome=1",
  recovery: "/auth/update-password",
  email_change: "/settings?email=changed",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const fail = (reason: string) => {
    const url = new URL("/auth/error", request.url);
    url.searchParams.set("reason", reason);
    if (type && TYPES.has(type)) url.searchParams.set("type", type);
    return NextResponse.redirect(url);
  };

  if (!tokenHash || !type || !TYPES.has(type) || tokenHash.length > 200) return fail("invalid");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    // Supabase reports both "expired" and "already used" as otp_expired.
    const reason = error.code === "otp_expired" ? "expired" : "invalid";
    if (reason === "invalid") console.error(JSON.stringify({ event: "auth.confirm_failed", code: error.code, type }));
    return fail(reason);
  }
  return NextResponse.redirect(new URL(DESTINATION[type] ?? "/", request.url));
}
