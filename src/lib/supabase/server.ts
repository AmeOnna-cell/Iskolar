import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { Database } from "./database.types";
import { supabaseConfig } from "./config";

/** The visitor's IP as seen by the platform (Vercel sets x-forwarded-for / x-real-ip). */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

/**
 * Supabase client for Server Components, Server Actions and Route Handlers, acting as the signed-in
 * user (RLS applies). It forwards the visitor's IP and user agent so database audit triggers can
 * record them (public.request_ip(), migration 5).
 */
export async function createClient() {
  const { url, anonKey } = supabaseConfig();
  const cookieStore = await cookies();
  const h = await headers();
  const ip = await clientIp();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there. Middleware refreshes the session.
        }
      },
    },
    global: {
      headers: {
        ...(ip ? { "x-client-ip": ip } : {}),
        "x-client-user-agent": (h.get("user-agent") ?? "").slice(0, 400),
      },
    },
  });
}
