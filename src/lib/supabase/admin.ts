import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseConfig, supabaseSecretKey } from "./config";

let admin: ReturnType<typeof createSupabaseClient<Database>> | null = null;

/**
 * Service-role client: bypasses RLS. Server-only (the `server-only` import fails any client
 * bundle, and ESLint blocks imports from client code). Use it only for what a user's own
 * session cannot do: Auth Admin API calls, rate limiting, scheduled jobs. Always check the
 * caller with requireRole() first.
 */
export function createAdminClient() {
  if (!admin) {
    const key = supabaseSecretKey();
    if (!key) throw new Error("SUPABASE_SECRET_KEY is not set (server only, see .env.example).");
    admin = createSupabaseClient<Database>(supabaseConfig().url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
