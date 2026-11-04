"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/auth";

const uuid = z.string().uuid();

/** Marks the given alerts (or every alert, when `ids` is null) as read. One transaction (RPC). */
export async function markRead(ids: string[] | null): Promise<{ ok: boolean; message: string }> {
  await requireRole("student");
  const parsed = ids === null ? null : z.array(uuid).max(200).safeParse(ids);
  if (parsed && !parsed.success) return { ok: false, message: "Those alerts couldn't be found." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_notifications_read", { p_ids: parsed ? parsed.data : undefined });
  if (error) return { ok: false, message: "Couldn't update your alerts. Try again." };
  revalidatePath("/", "layout");
  const n = data ?? 0;
  return { ok: true, message: n === 0 ? "Already read." : `${n} ${n === 1 ? "alert" : "alerts"} marked as read.` };
}

const prefsSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  site: z.boolean(),
  lead_days: z.coerce.number().refine((n) => [1, 3, 7, 14].includes(n), "Choose 1, 3, 7 or 14 days."),
  new_matches: z.boolean(),
  changes: z.boolean(),
});

export async function savePreferences(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole("student");
  const on = (k: string) => fd.get(k) === "on";
  const parsed = prefsSchema.safeParse({
    email: on("email"),
    push: on("push"),
    site: on("site"),
    lead_days: fd.get("lead_days"),
    new_matches: on("new_matches"),
    changes: on("changes"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your settings." };
  const supabase = await createClient();
  const { error } = await supabase.from("notification_preferences").update(parsed.data).eq("user_id", user.id);
  if (error) return { status: "error", message: "Couldn't save your settings. Try again." };
  revalidatePath("/alerts");
  revalidatePath("/settings");
  return { status: "success", message: "Reminder settings saved." };
}

const subSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Saves this browser's push subscription for the signed-in student. */
export async function savePushSubscription(sub: unknown, userAgent: string): Promise<{ ok: boolean; message?: string }> {
  const user = await requireRole("student");
  const parsed = subSchema.safeParse(sub);
  if (!parsed.success) return { ok: false, message: "This browser returned an invalid push subscription." };
  // An endpoint belongs to one browser profile; if someone else signed in there before, it moves
  // to this account (service role: the old row isn't visible to this user under RLS).
  const admin = createAdminClient();
  await admin.from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint);
  const { error } = await admin.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    user_agent: userAgent.slice(0, 400) || null,
  });
  return error ? { ok: false, message: "Couldn't turn on push notifications. Try again." } : { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await requireRole("student");
  if (typeof endpoint !== "string" || endpoint.length > 1000) return;
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
