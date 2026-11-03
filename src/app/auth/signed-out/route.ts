import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, homeFor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// requireRole() sends deactivated or deleted accounts here: Server Components can't clear cookies,
// a Route Handler can. Only non-active accounts are signed out, so a link to this URL can't be
// used to sign out someone who is active.
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (user && user.status === "active") {
    return NextResponse.redirect(new URL(homeFor(user.role), request.url));
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login?error=deactivated", request.url));
}
