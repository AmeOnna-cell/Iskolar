"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminResult = { ok: boolean; message: string; results?: Array<{ id: string; ok: boolean; error: string | null }> };

const BAN_FOREVER = "876000h"; // ~100 years: Supabase's way to ban until lifted

/** Audit entry for an Auth Admin API call, written by the server in the admin's name. */
async function logAuth(actor: string, action: string, userId: string, after: Record<string, unknown>) {
  await createAdminClient().rpc("log_audit", { p_action: action, p_entity_type: "user", p_entity_id: userId, p_after: after as never, p_actor: actor });
}

/**
 * Deactivate or reactivate accounts. The database step (batch_users_status) enforces the guards
 * (not yourself, never the last admin) and audits each row; then each changed account is banned or
 * unbanned in Supabase Auth and its sessions are revoked immediately.
 */
export async function setUsersStatus(ids: string[], status: string): Promise<AdminResult> {
  const admin = await requireRole("admin");
  const parsed = z.object({ ids: z.array(z.uuid()).min(1).max(200), status: z.enum(["active", "deactivated"]) }).safeParse({ ids, status });
  if (!parsed.success) return { ok: false, message: "Choose at least one account." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("batch_users_status", { p_ids: parsed.data.ids, p_status: parsed.data.status });
  if (error) return { ok: false, message: "That didn't work. Refresh and try again." };

  const service = createAdminClient();
  for (const row of data.filter((r) => r.ok)) {
    const { error: banError } = await service.auth.admin.updateUserById(row.id, {
      ban_duration: parsed.data.status === "deactivated" ? BAN_FOREVER : "none",
    });
    if (banError) {
      console.error(JSON.stringify({ event: "admin.ban_failed", user: row.id, message: banError.message }));
      row.ok = false;
      row.error = "Saved, but the sign-in ban didn't apply. Try again.";
      continue;
    }
    if (parsed.data.status === "deactivated") await service.rpc("revoke_user_sessions", { p_user: row.id });
    await logAuth(admin.id, parsed.data.status === "deactivated" ? "user.ban_and_sign_out" : "user.unban", row.id, { status: parsed.data.status });
  }
  revalidatePath("/admin/users");
  const done = data.filter((r) => r.ok).length;
  const word = parsed.data.status === "deactivated" ? "deactivated" : "reactivated";
  return { ok: done === data.length, message: `${done} ${done === 1 ? "account" : "accounts"} ${word}${data.length - done ? `, ${data.length - done} not changed` : ""}.`, results: data };
}

/** Change a role. Sessions are revoked so the next sign-in carries the new role in its token. */
export async function setUserRole(userId: string, role: string): Promise<AdminResult> {
  const admin = await requireRole("admin");
  const parsed = z.object({ id: z.uuid(), role: z.enum(["student", "coordinator", "admin"]) }).safeParse({ id: userId, role });
  if (!parsed.success) return { ok: false, message: "That didn't work." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { p_user: parsed.data.id, p_role: parsed.data.role });
  if (error) return { ok: false, message: error.message };
  await createAdminClient().rpc("revoke_user_sessions", { p_user: parsed.data.id });
  await logAuth(admin.id, "user.sign_out_after_role_change", parsed.data.id, { role: parsed.data.role });
  revalidatePath("/admin/users");
  const label = { student: "Student", coordinator: "Coordinator", admin: "Admin" }[parsed.data.role];
  return { ok: true, message: `Role changed to ${label}. They'll need to sign in again.` };
}

/**
 * Delete an account: requires the admin to type the account's email. Step 1 (database) removes
 * personal data and keeps an anonymised tombstone; step 2 deletes the Supabase Auth user.
 * See docs/data-retention.md.
 */
export async function deleteUser(userId: string, typedEmail: string): Promise<AdminResult> {
  const admin = await requireRole("admin");
  const parsed = z.object({ id: z.uuid(), email: z.string().trim().toLowerCase().min(3) }).safeParse({ id: userId, email: typedEmail });
  if (!parsed.success) return { ok: false, message: "Type the account's email to confirm." };

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("email, status").eq("id", parsed.data.id).maybeSingle();
  if (!profile) return { ok: false, message: "Account not found." };
  if ((profile.email ?? "").toLowerCase() !== parsed.data.email) {
    return { ok: false, message: "The email you typed doesn't match this account." };
  }
  const { error } = await supabase.rpc("admin_soft_delete_user", { p_user: parsed.data.id });
  if (error) return { ok: false, message: error.message };

  const service = createAdminClient();
  await service.rpc("revoke_user_sessions", { p_user: parsed.data.id });
  const { error: deleteError } = await service.auth.admin.deleteUser(parsed.data.id);
  if (deleteError) {
    console.error(JSON.stringify({ event: "admin.auth_delete_failed", user: parsed.data.id, message: deleteError.message }));
    return { ok: false, message: "Personal data was removed, but the sign-in account couldn't be deleted. Try again." };
  }
  await logAuth(admin.id, "user.auth_deleted", parsed.data.id, { status: "deleted" });
  revalidatePath("/admin/users");
  return { ok: true, message: "Account deleted. Personal data was removed." };
}
