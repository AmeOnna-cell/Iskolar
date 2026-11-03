import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseConfig } from "./config";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Browser client (anon key + the user's session cookie). RLS applies to everything it does. */
export function createClient() {
  if (!client) {
    const { url, anonKey } = supabaseConfig();
    client = createBrowserClient<Database>(url, anonKey);
  }
  return client;
}
