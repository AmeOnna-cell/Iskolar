import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Unread alerts for the signed-in student (RLS: own rows only). Uses the (user_id, read_at, created_at) index. */
export async function unreadCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}

export async function listNotifications(show: "all" | "unread", page: number, pageSize: number) {
  const supabase = await createClient();
  let q = supabase
    .from("notifications")
    .select("id, kind, title, body, link, read_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (show === "unread") q = q.is("read_at", null);
  const { data, count } = await q;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function getPreferences() {
  const supabase = await createClient();
  const { data } = await supabase.from("notification_preferences").select("email, push, site, lead_days, new_matches, changes").maybeSingle();
  return data ?? { email: true, push: false, site: true, lead_days: 7, new_matches: true, changes: true };
}

export async function hasPushSubscription(): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true });
  return (count ?? 0) > 0;
}
