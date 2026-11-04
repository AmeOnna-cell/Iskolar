import "server-only";
import webpush from "web-push";
import { emailAppUrl, readEmailEnv, sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatch, type DispatchDeps, type DispatchSummary, type PushSub } from "./dispatch";

/**
 * Emails per rolling 24 hours. Gmail allows about 500 a day per account, and Supabase's sign-up and
 * password emails use the same account, so the default leaves room for those (docs/setup-smtp.md).
 * Set EMAIL_DAILY_LIMIT to raise it, e.g. on Google Workspace (2,000/day).
 */
export function emailDailyLimit() {
  const n = Number(process.env.EMAIL_DAILY_LIMIT);
  return Number.isInteger(n) && n > 0 ? n : 450;
}
const BATCH = 100;

const manilaToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let vapidReady = false;
function sendPush(sub: PushSub, payload: string): Promise<{ ok: true } | { ok: false; gone: boolean; error: string }> {
  if (!pushConfigured()) return Promise.resolve({ ok: false, gone: false, error: "push not configured" });
  if (!vapidReady) {
    webpush.setVapidDetails(`mailto:${readEmailEnv(process.env).gmailUser}`, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
    vapidReady = true;
  }
  return webpush
    .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 60 * 60 * 24 })
    .then(() => ({ ok: true as const }))
    .catch((err: { statusCode?: number; body?: string; message?: string }) => ({
      ok: false as const,
      gone: err.statusCode === 404 || err.statusCode === 410,
      error: `push ${err.statusCode ?? "error"}: ${(err.body || err.message || "").slice(0, 200)}`,
    }));
}

/** Claims and delivers pending notifications until the queue is empty or `deadlineMs` passes. */
export async function deliverPending(deadlineMs = 45_000): Promise<DispatchSummary & { claimed: number }> {
  const db = createAdminClient();
  const stop = Date.now() + deadlineMs;
  const total = { claimed: 0, emailed: 0, emailFailed: 0, deferred: 0, pushed: 0, pushFailed: 0, skipped: 0 };

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count: sentToday } = await db.from("notifications").select("id", { count: "exact", head: true }).eq("email_status", "sent").gt("emailed_at", since);
  let budget = Math.max(0, emailDailyLimit() - (sentToday ?? 0));

  const deps: Omit<DispatchDeps, "emailBudget"> = {
    appUrl: emailAppUrl(),
    today: manilaToday(),
    async recipients(ids) {
      const [{ data: people }, { data: prefs }] = await Promise.all([
        db.from("profiles").select("id, email, full_name, status, role").in("id", ids),
        db.from("notification_preferences").select("user_id, email, push").in("user_id", ids),
      ]);
      const pref = new Map((prefs ?? []).map((p) => [p.user_id, p]));
      return new Map(
        (people ?? []).map((p) => [
          p.id,
          { email: p.email, name: p.full_name, active: p.status === "active" && p.role === "student", wantsEmail: pref.get(p.id)?.email ?? false, wantsPush: pref.get(p.id)?.push ?? false },
        ]),
      );
    },
    async subscriptions(ids) {
      const { data } = await db.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", ids);
      return (data ?? []).map((s) => ({ id: s.id, userId: s.user_id, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }));
    },
    sendEmail,
    sendPush,
    async removeSubscription(id) {
      await db.from("push_subscriptions").delete().eq("id", id);
    },
    async update(id, patch) {
      const { error } = await db.from("notifications").update(patch).eq("id", id);
      if (error) console.error(JSON.stringify({ event: "notifications.update_failed", id, code: error.code }));
    },
  };

  while (Date.now() < stop) {
    const { data: rows, error } = await db.rpc("claim_notifications", { p_limit: BATCH });
    if (error) throw new Error(`claim_notifications failed: ${error.message}`);
    if (!rows?.length) break;
    const sum = await dispatch(rows, { ...deps, emailBudget: budget });
    budget = Math.max(0, budget - sum.emailed - sum.emailFailed);
    total.claimed += rows.length;
    for (const k of ["emailed", "emailFailed", "deferred", "pushed", "pushFailed", "skipped"] as const) total[k] += sum[k];
    if (sum.emailFailed || sum.pushFailed) {
      console.error(JSON.stringify({ event: "notifications.delivery_failures", emailFailed: sum.emailFailed, pushFailed: sum.pushFailed }));
    }
    // Everything left is waiting on the email budget: stop instead of re-claiming the same rows.
    if (sum.deferred === rows.length || rows.length < BATCH) break;
  }
  return total;
}
