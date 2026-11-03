import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseConfig } from "./config";

/**
 * Cookie-less anon client for public, non-personalised reads (published listings). Safe to use
 * inside unstable_cache: it never carries a user's session, so cached results can't leak
 * personal data. RLS limits it to what any visitor can see.
 */
export function createPublicClient() {
  const { url, anonKey } = supabaseConfig();
  return createSupabaseClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
