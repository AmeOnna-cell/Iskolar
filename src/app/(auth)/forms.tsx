"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { PasswordField } from "@/components/ui/password-field";
import { idle, type FormState } from "@/lib/validation/auth";
import { requestPasswordReset, resendConfirmation, signIn, signUp, updatePassword } from "./actions";

function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <Notice tone={state.status === "success" ? "ok" : "danger"} live>
      {state.message}
    </Notice>
  );
}

// ---------- Sign in ----------

export function LoginForm({ next, notice }: { next?: string; notice?: React.ReactNode }) {
  const [state, action, pending] = useActionState(signIn, idle);
  const email = state.values?.email ?? "";
  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      {notice && !state.message ? notice : null}
      <FormMessage state={state} />
      {state.code === "unconfirmed" ? (
        <ButtonLink href={`/check-email?email=${encodeURIComponent(email)}`} variant="outline">
          Send a new confirmation link
        </ButtonLink>
      ) : null}
      <input type="hidden" name="next" value={next ?? ""} />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={email}
        error={state.fieldErrors?.email}
      />
      <div className="flex flex-col gap-2">
        <PasswordField label="Password" name="password" autoComplete="current-password" error={state.fieldErrors?.password} />
        <Link href="/forgot-password" className="self-start text-sm font-semibold">
          Forgot your password?
        </Link>
      </div>
      <Button type="submit" loading={pending} block>
        Sign in
      </Button>
      <p className="text-sm text-ink-secondary">
        New to Iskolar? <Link href="/signup" className="font-semibold">Create an account</Link>
      </p>
    </form>
  );
}

// ---------- Sign up ----------

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, idle);
  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <FormMessage state={state} />
      <TextField
        label="Full name"
        name="fullName"
        autoComplete="name"
        required
        maxLength={120}
        defaultValue={state.values?.fullName}
        error={state.fieldErrors?.fullName}
      />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        hint="We'll send a confirmation link here, then reminders if you turn them on."
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <PasswordField label="Password" name="password" autoComplete="new-password" rules error={state.fieldErrors?.password} />
      <PasswordField label="Type the password again" name="confirm" autoComplete="new-password" error={state.fieldErrors?.confirm} />
      <Button type="submit" loading={pending} block>
        Create account
      </Button>
      <p className="text-sm text-ink-secondary">
        Already have an account? <Link href="/login" className="font-semibold">Sign in</Link>
      </p>
    </form>
  );
}

// ---------- Resend confirmation (60-second cooldown) ----------

const COOLDOWN = 60;

export function ResendForm({ email, askEmail = false, startCooling = false }: { email?: string; askEmail?: boolean; startCooling?: boolean }) {
  const [state, action, pending] = useActionState(resendConfirmation, idle);
  const [left, setLeft] = useState(startCooling ? COOLDOWN : 0);

  useEffect(() => {
    if (state.status === "success") setLeft(COOLDOWN);
  }, [state]);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage state={state} />
      {askEmail ? (
        <TextField label="Email" name="email" type="email" autoComplete="email" required defaultValue={email} error={state.fieldErrors?.email} />
      ) : (
        <input type="hidden" name="email" value={email ?? ""} />
      )}
      <Button type="submit" variant="outline" loading={pending} disabled={left > 0} block>
        {left > 0 ? `Send a new link in ${left}s` : "Send a new link"}
      </Button>
    </form>
  );
}

// ---------- Forgot password ----------

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, idle);
  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <FormMessage state={state} />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <Button type="submit" loading={pending} block>
        {state.status === "success" ? "Send another link" : "Send reset link"}
      </Button>
      <p className="text-sm text-ink-secondary">
        Remembered it? <Link href="/login" className="font-semibold">Sign in</Link>
      </p>
    </form>
  );
}

// ---------- New password ----------

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, idle);
  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <FormMessage state={state} />
      <PasswordField label="New password" name="password" autoComplete="new-password" rules error={state.fieldErrors?.password} />
      <PasswordField label="Type the new password again" name="confirm" autoComplete="new-password" error={state.fieldErrors?.confirm} />
      <Button type="submit" loading={pending} block>
        Save new password
      </Button>
      <p className="text-caption text-ink-hint">Saving signs you out on your other devices.</p>
    </form>
  );
}
