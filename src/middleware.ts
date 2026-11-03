// Layer 1 of 4: refresh the session, verify the user with Supabase Auth, gate routes by role.
// Layers 2–4: requireRole() in every server action/route, RLS, and the deactivation lock-out.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { accessFor } from "@/lib/auth/routes";
import type { Role } from "@/lib/nav";
import { supabaseConfig } from "@/lib/supabase/config";

const NO_STORE = "no-store, no-cache, must-revalidate, private";

function homeFor(role: Role | null): string {
  if (role === "coordinator" || role === "admin") return "/staff";
  return "/dashboard";
}

export async function middleware(request: NextRequest) {
  const { url, anonKey } = supabaseConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser() asks Supabase Auth, so a session revoked elsewhere (password reset, ban, sign out
  // everywhere) is rejected here too. A signature-only check (getClaims) would still accept its
  // unexpired access token and disagree with the page guard. Never trust getSession() on the server.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = Boolean(user);
  // The role claim from the custom access token hook, read only once the user is verified.
  const claims = signedIn ? (await supabase.auth.getClaims()).data?.claims : null;
  const role = (claims?.app_role as Role | undefined) ?? (signedIn ? "student" : null);

  const { pathname, search } = request.nextUrl;
  const access = accessFor(pathname);

  // Keep refreshed session cookies on any response we return instead of `response`.
  const withCookies = (res: NextResponse) => {
    for (const cookie of response.cookies.getAll()) res.cookies.set(cookie);
    if (signedIn) res.headers.set("Cache-Control", NO_STORE);
    return res;
  };

  if (access.kind === "guest-only" && signedIn) {
    return withCookies(NextResponse.redirect(new URL(homeFor(role), request.url)));
  }

  if ((access.kind === "signed-in" || access.kind === "roles") && !signedIn) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return withCookies(NextResponse.redirect(login));
  }

  if (access.kind === "roles" && role && !access.roles.includes(role)) {
    // A real 403 page with a 403 status, not a redirect loop.
    return withCookies(NextResponse.rewrite(new URL("/403", request.url), { status: 403 }));
  }

  // Signed-in visitors landing on the public home go to their own home.
  if (pathname === "/" && signedIn) {
    return withCookies(NextResponse.redirect(new URL(homeFor(role), request.url)));
  }

  // Pages rendered for a signed-in person must never be cached by the browser or the bfcache,
  // so Back after sign-out cannot show them.
  if (signedIn) response.headers.set("Cache-Control", NO_STORE);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
