// Delivers claimed notifications by email and web push. Pure: every side effect comes in through
// `deps`, so the rules (preferences, budget, retries, dead subscriptions) are unit-tested.
import {
  announcementEmail,
  deadlineChangedEmail,
  deadlineReminderEmail,
  newMatchEmail,
  requirementsChangedEmail,
  type RenderedEmail,
} from "@/lib/email/templates";
import type { EmailMessage, SendResult } from "@/lib/email/send";
import type { Database } from "@/lib/supabase/database.types";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type Patch = Database["public"]["Tables"]["notifications"]["Update"];

export type Recipient = { email: string | null; name: string | null; active: boolean; wantsEmail: boolean; wantsPush: boolean };
export type PushSub = { id: string; userId: string; endpoint: string; p256dh: string; auth: string };
export type PushResult = { ok: true } | { ok: false; gone: boolean; error: string };

export type DispatchDeps = {
  appUrl: string;
  /** Today in Manila, YYYY-MM-DD. */
  today: string;
  /** Emails still allowed in the current 24 hours (Gmail allows ~500/day per account). */
  emailBudget: number;
  recipients(userIds: string[]): Promise<Map<string, Recipient>>;
  subscriptions(userIds: string[]): Promise<PushSub[]>;
  sendEmail(message: EmailMessage): Promise<SendResult>;
  sendPush(sub: PushSub, payload: string): Promise<PushResult>;
  removeSubscription(id: string): Promise<void>;
  update(id: string, patch: Patch): Promise<void>;
  now?: () => Date;
};

export type DispatchSummary = { emailed: number; emailFailed: number; deferred: number; pushed: number; pushFailed: number; skipped: number };

/** Tries per email across runs (each run also retries temporary SMTP errors itself). */
export const MAX_EMAIL_ATTEMPTS = 3;

type P = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** The email for one notification, or null when it no longer makes sense to send (deadline passed). */
export function renderNotificationEmail(row: NotificationRow, appUrl: string, studentName: string | null, today: string): RenderedEmail | null {
  const p = (row.payload ?? {}) as P;
  const base = { appUrl, studentName, scholarshipName: str(p.scholarship_name), providerName: str(p.provider_name), scholarshipPath: str(p.path) || row.link || "/alerts" };
  switch (row.kind) {
    case "deadline": {
      const closesOn = str(p.closes_on);
      const daysLeft = daysBetween(today, closesOn);
      if (!closesOn || daysLeft < 0) return null;
      return deadlineReminderEmail({ ...base, closesOn, daysLeft, documentsLeft: num(p.documents_left), documentsTotal: num(p.documents_total) });
    }
    case "change":
      return p.change === "deadline"
        ? deadlineChangedEmail({ ...base, previousClosesOn: str(p.previous_closes_on), newClosesOn: str(p.new_closes_on) })
        : requirementsChangedEmail(base);
    case "new":
      return newMatchEmail({ ...base, amount: str(p.amount), verdict: p.verdict === "yes" ? "yes" : "maybe", closesOn: str(p.closes_on) || null });
    case "announce":
      return announcementEmail({ appUrl, title: str(p.title) || row.title, body: str(p.body) || row.body, from: str(p.from) || "Scholarship office", path: row.link });
  }
}

export async function dispatch(rows: NotificationRow[], deps: DispatchDeps): Promise<DispatchSummary> {
  const sum: DispatchSummary = { emailed: 0, emailFailed: 0, deferred: 0, pushed: 0, pushFailed: 0, skipped: 0 };
  if (!rows.length) return sum;
  const now = () => (deps.now ? deps.now() : new Date()).toISOString();
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const pushUsers = [...new Set(rows.filter((r) => r.push_status === "pending").map((r) => r.user_id))];
  const [people, subs] = await Promise.all([deps.recipients(userIds), pushUsers.length ? deps.subscriptions(pushUsers) : Promise.resolve([])]);
  const gone = new Set<string>();
  let budget = deps.emailBudget;

  for (const row of rows) {
    const who = people.get(row.user_id);
    const patch: Patch = {};

    if (row.email_status === "pending") {
      const msg = who?.active && who.wantsEmail && who.email ? renderNotificationEmail(row, deps.appUrl, who.name, deps.today) : null;
      if (!msg) {
        patch.email_status = "skipped";
        sum.skipped++;
      } else if (budget <= 0) {
        sum.deferred++; // stays pending; the lease expires and a later run sends it
      } else {
        budget--;
        const res = await deps.sendEmail({ to: who!.email!, ...msg });
        const attempts = row.email_attempts + 1;
        patch.email_attempts = attempts;
        if (res.ok) {
          Object.assign(patch, { email_status: "sent", emailed_at: now(), email_error: null });
          sum.emailed++;
        } else {
          patch.email_error = `${res.error.code}: ${res.error.message}`.slice(0, 500);
          if (attempts >= MAX_EMAIL_ATTEMPTS || !res.error.retryable) patch.email_status = "failed";
          sum.emailFailed++;
        }
      }
    }

    if (row.push_status === "pending") {
      const mine = subs.filter((s) => s.userId === row.user_id && !gone.has(s.id));
      if (!who?.active || !who.wantsPush || !mine.length) {
        patch.push_status = "skipped";
        sum.skipped++;
      } else {
        const payload = JSON.stringify({ title: row.title, body: row.body, link: row.link ?? "/alerts", tag: row.id });
        let ok = 0;
        const errors: string[] = [];
        for (const s of mine) {
          const res = await deps.sendPush(s, payload);
          if (res.ok) ok++;
          else {
            errors.push(res.error);
            if (res.gone) {
              gone.add(s.id);
              await deps.removeSubscription(s.id);
            }
          }
        }
        patch.push_status = ok ? "sent" : "failed";
        patch.push_error = errors.length ? errors.join("; ").slice(0, 500) : null;
        if (ok) sum.pushed++;
        else sum.pushFailed++;
      }
    }

    if (Object.keys(patch).length) await deps.update(row.id, patch);
  }
  return sum;
}
