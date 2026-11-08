"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { rateLimitAll } from "@/lib/auth/rate-limit";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { changePasswordSchema, deleteAccountSchema, fieldErrorsOf, nameSchema, type FormState } from "@/lib/validation/auth";

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};
const WRONG_PASSWORD = "That isn't your current password.";

/** Erases the student's own eligibility answers (RLS: own row only). Applications and alerts stay. */
export async function deleteMyAnswers(): Promise<{ ok: boolean; message: string }> {
  const user = await requireRole("student");
  const supabase = await createClient();
  const { error } = await supabase.from("student_profiles").delete().eq("user_id", user.id);
  if (error) return { ok: false, message: "We couldn't delete your answers. Try again." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Your eligibility answers are deleted." };
}

/** Change the full name (RLS: own row, only full_name is updatable). */
export async function updateName(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole();
  const values = { fullName: str(fd, "fullName") };
  const parsed = nameSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.fullName }).eq("id", user.id);
  if (error) return { status: "error", message: "We couldn't save your name. Try again.", values };
  revalidatePath("/", "layout");
  return { status: "success", message: "Name saved.", values: { fullName: parsed.data.fullName } };
}

/**
 * Change the password from My profile: the current password is checked first (a throwaway,
 * cookie-less sign-in, so Supabase Auth's own limits apply too), then the new one is set and every
 * other device is signed out.
 */
export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole();
  const parsed = changePasswordSchema.safeParse({ current: str(fd, "current"), password: str(fd, "password") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  if (!(await rateLimitAll([[`password:user:${user.id}`, 10, 3600]]))) {
    return { status: "error", message: "Too many attempts. Wait an hour, then try again." };
  }

  const check = createPublicClient();
  const { error: wrong } = await check.auth.signInWithPassword({ email: user.email, password: parsed.data.current });
  if (wrong) {
    if (wrong.code === "invalid_credentials") return { status: "error", fieldErrors: { current: WRONG_PASSWORD } };
    console.error(JSON.stringify({ event: "profile.password_check_failed", code: wrong.code, status: wrong.status }));
    return { status: "error", message: "We couldn't check your password right now. Try again in a minute." };
  }
  await check.auth.signOut({ scope: "local" }); // end the throwaway session

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { status: "error", fieldErrors: { password: "Choose a password different from your current one." } };
    if (error.code === "weak_password") return { status: "error", fieldErrors: { password: "Choose a stronger password: avoid common or leaked passwords." } };
    console.error(JSON.stringify({ event: "profile.update_password_failed", code: error.code, status: error.status }));
    return { status: "error", message: "Something went wrong on our side. Try again in a minute." };
  }
  await supabase.auth.signOut({ scope: "others" });
  return { status: "success", message: "Password changed. Your other devices were signed out." };
}

/**
 * Delete my own account. The database (delete_my_account) re-checks the typed email and the current
 * password, refuses the last active admin, removes personal data, audits it and ends every session;
 * then the Supabase Auth user is deleted, as in the admin path. See docs/data-retention.md.
 */
export async function deleteMyAccount(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole();
  const values = { email: str(fd, "email") };
  const parsed = deleteAccountSchema.safeParse({ email: values.email, password: str(fd, "password") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_my_account", { p_email: parsed.data.email, p_password: parsed.data.password });
  if (error) {
    // The database's messages are written for people (email mismatch, last admin).
    if (error.code === "22023") return { status: "error", fieldErrors: { email: error.message }, values };
    return { status: "error", message: error.message, values };
  }
  if (data === "wrong_password") return { status: "error", fieldErrors: { password: WRONG_PASSWORD }, values };
  if (data === "too_many_attempts") return { status: "error", message: "Too many tries. Wait an hour, then try again.", values };

  const service = createAdminClient();
  const { error: authError } = await service.auth.admin.deleteUser(user.id);
  if (authError) {
    // Personal data is already gone and every session ended; an admin can finish this from the audit trail.
    console.error(JSON.stringify({ event: "profile.auth_delete_failed", user: user.id, message: authError.message }));
  } else {
    await service.rpc("log_audit", { p_action: "user.auth_deleted", p_entity_type: "user", p_entity_id: user.id, p_after: { status: "deleted" }, p_actor: user.id });
  }
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined); // clear this browser's cookies
  redirect("/goodbye");
}
