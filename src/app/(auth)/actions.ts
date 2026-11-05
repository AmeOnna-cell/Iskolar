"use server";

import { redirect } from "next/navigation";
import { emailAppUrl } from "@/lib/email";
import { rateLimitAll } from "@/lib/auth/rate-limit";
import { safeNextPath } from "@/lib/auth/routes";
import { homeFor, requireRole } from "@/lib/auth/session";
import { clientIp, createClient } from "@/lib/supabase/server";
import {
  emailOnlySchema,
  fieldErrorsOf,
  newPasswordSchema,
  signInSchema,
  signUpSchema,
  type FormState,
} from "@/lib/validation/auth";

const DEACTIVATED = "This account has been deactivated. Contact the scholarship office if you think this is a mistake.";
// Per-IP limits are generous because many students share one IP (campus Wi-Fi, carrier NAT);
// the per-email limits are what stop password guessing.
const TOO_MANY = "Too many attempts. Wait 15 minutes, then try again.";
const UNAVAILABLE = "Something went wrong on our side. Try again in a minute.";

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

async function ipKey() {
  return (await clientIp()) ?? "unknown";
}

// ---------- Sign in ----------

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = { email: str(fd, "email"), next: str(fd, "next") };
  const parsed = signInSchema.safeParse({ email: values.email, password: str(fd, "password"), next: values.next });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values };
  const { email, password, next } = parsed.data;

  const ip = await ipKey();
  if (!(await rateLimitAll([[`login:ip:${ip}`, 100, 900], [`login:email:${email}`, 10, 900]]))) {
    return { status: "error", message: TOO_MANY, values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        status: "error",
        code: "unconfirmed",
        message: "Confirm your email address first. Open the link we sent you, or send a new one.",
        values,
      };
    }
    if (error.code === "user_banned" || /deactivated/i.test(error.message)) {
      return { status: "error", code: "deactivated", message: DEACTIVATED, values };
    }
    if (error.code === "over_request_rate_limit" || error.status === 429) {
      return { status: "error", message: TOO_MANY, values };
    }
    if (error.code === "invalid_credentials") {
      return { status: "error", message: "That email and password don't match an account. Check both and try again.", values };
    }
    console.error(JSON.stringify({ event: "auth.sign_in_failed", code: error.code, status: error.status }));
    return { status: "error", message: UNAVAILABLE, values };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user!.id).single();
  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    return { status: "error", code: "deactivated", message: DEACTIVATED, values };
  }
  redirect(safeNextPath(next, homeFor(profile.role)));
}

// ---------- Sign up ----------

export async function signUp(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = { fullName: str(fd, "fullName"), email: str(fd, "email") };
  const parsed = signUpSchema.safeParse({ ...values, password: str(fd, "password") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values };
  const { fullName, email, password } = parsed.data;

  const ip = await ipKey();
  if (!(await rateLimitAll([[`signup:ip:${ip}`, 30, 3600], [`signup:email:${email}`, 3, 3600]]))) {
    return { status: "error", message: TOO_MANY, values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: `${emailAppUrl()}/auth/confirm` },
  });
  if (error) {
    if (error.code === "weak_password") {
      return { status: "error", fieldErrors: { password: "Choose a stronger password: avoid common or leaked passwords." }, values };
    }
    // Supabase throttles emails per address. Hitting that only happens when the address signed up
    // moments ago, so answering differently would reveal it exists: show "check your email" anyway.
    if (error.code !== "over_email_send_rate_limit") {
      console.error(JSON.stringify({ event: "auth.sign_up_failed", code: error.code, status: error.status }));
      return { status: "error", message: UNAVAILABLE, values };
    }
  }
  // An existing account gets the same "check your email" screen (no account enumeration):
  // Supabase reports success without sending when the address is already registered.
  redirect(`/check-email?email=${encodeURIComponent(email)}`);
}

// ---------- Resend the confirmation email (with cooldown) ----------

export async function resendConfirmation(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = emailOnlySchema.safeParse({ email: str(fd, "email") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  const { email } = parsed.data;
  const ip = await ipKey();
  if (!(await rateLimitAll([[`resend:ip:${ip}`, 10, 3600], [`resend:email:${email}`, 3, 900]]))) {
    return { status: "error", message: TOO_MANY };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${emailAppUrl()}/auth/confirm` },
  });
  if (error && error.code !== "over_email_send_rate_limit") {
    console.error(JSON.stringify({ event: "auth.resend_failed", code: error.code, status: error.status }));
  }
  // Same answer whether or not the address has an unconfirmed account.
  return { status: "success", message: `If ${email} is waiting for confirmation, a new link is on its way.` };
}

// ---------- Forgot password ----------

export async function requestPasswordReset(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = { email: str(fd, "email") };
  const parsed = emailOnlySchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values };
  const { email } = parsed.data;
  const ip = await ipKey();
  if (!(await rateLimitAll([[`reset:ip:${ip}`, 10, 3600], [`reset:email:${email}`, 3, 900]]))) {
    return { status: "error", message: TOO_MANY, values };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${emailAppUrl()}/auth/update-password`,
  });
  if (error) console.error(JSON.stringify({ event: "auth.reset_failed", code: error.code, status: error.status }));
  // Same message whether or not the account exists (no account enumeration).
  return {
    status: "success",
    message: `If there's an Iskolar account for ${email}, we've sent a link to reset the password. It expires in 1 hour.`,
    values,
  };
}

// ---------- Set a new password (after the reset link, or from settings) ----------

export async function updatePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole();
  const parsed = newPasswordSchema.safeParse({ password: str(fd, "password") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  if (!(await rateLimitAll([[`password:user:${user.id}`, 10, 3600]]))) return { status: "error", message: TOO_MANY };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { status: "error", fieldErrors: { password: "Choose a password different from your current one." } };
    }
    if (error.code === "weak_password") {
      return { status: "error", fieldErrors: { password: "Choose a stronger password: avoid common or leaked passwords." } };
    }
    console.error(JSON.stringify({ event: "auth.update_password_failed", code: error.code, status: error.status }));
    return { status: "error", message: UNAVAILABLE };
  }
  // Sign out every other device and browser that had this account open.
  await supabase.auth.signOut({ scope: "others" });
  redirect(`${homeFor(user.role)}?password=updated`);
}

// ---------- Sign out (the client then calls router.replace("/login")) ----------

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
