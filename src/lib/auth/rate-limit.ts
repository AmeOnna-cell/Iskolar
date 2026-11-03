import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limit backed by Postgres (public.check_rate_limit, service role only).
 * Fails closed: if the check itself errors, the request is refused.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error(JSON.stringify({ event: "rate_limit.error", key: key.split(":")[0], message: error.message }));
    return false;
  }
  return data === true;
}

/** All limits must pass. Each call counts against every key. */
export async function rateLimitAll(limits: Array<[key: string, max: number, windowSeconds: number]>): Promise<boolean> {
  const results = await Promise.all(limits.map(([k, m, w]) => rateLimit(k, m, w)));
  return results.every(Boolean);
}
