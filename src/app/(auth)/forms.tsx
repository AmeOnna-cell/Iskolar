"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { PasswordField } from "@/components/ui/password-field";
import { idle, type FormState } from "@/lib/validation/auth";
import { requestPasswordReset, resendConfirmation, signIn, signUp, updatePassword } from "./actions";

/** The form's result: the server's message, or a count of field errors when there is no message. */
export function FormMessage({ state }: { state: FormState }) {
  const fieldCount = Object.keys(state.fieldErrors ?? {}).length;
  const text = state.message ?? (fieldCount ? `${fieldCount} ${fieldCount === 1 ? "thing" : "things"} to fix below.` : null);
  if (!text) return null;
  return (
    <div data-form-message tabIndex={-1} className="outline-none">
      <Notice tone={state.status === "success" ? "ok" : "danger"} live>
        {text}
      </Notice>
    </div>
  );
}

/**
 * After each submit, move focus to the first invalid field, else to the result message, so a
 * keyboard or screen-reader user isn't left on <body> once the submit button re-enables.
 */
export function useFocusResult<T extends HTMLElement>(state: FormState) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (state.status === "idle") return;
    const root = ref.current;
    (root?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? root?.querySelector<HTMLElement>("[data-form-message]"))?.focus();
  }, [state]);
  return ref;
}

/** What to do while waiting for an email: open Gmail at the message, or search for its subject. */
export function InboxHelp({ subject }: { subject: string }) {
  return (
    <div className="flex flex-col gap-3">
      <ButtonLink
        href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(`subject:"${subject}"`)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Gmail<span className="sr-only"> (opens in a new tab)</span>
      </ButtonLink>
      <p className="text-sm text-ink-secondary">
        Look for the subject &ldquo;{subject}&rdquo;. Not there after a few minutes? Check your spam or promotions folder.
      </p>
    </div>
  );
}

// ---------- Sign in ----------

export function LoginForm({ next, notice }: { next?: string; notice?: React.ReactNode }) {
  const [state, action, pending] = useActionState(signIn, idle);
  const ref = useFocusResult<HTMLFormElement>(state);
  const email = state.values?.email ?? "";
  return (
    <form ref={ref} action={action} noValidate className="flex flex-col gap-6">
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
  const ref = useFocusResult<HTMLFormElement>(state);
  return (
    <form ref={ref} action={action} noValidate className="flex flex-col gap-6">
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
      {PRIVACY_NOTE ? <p className="text-caption text-ink-secondary">{PRIVACY_NOTE}</p> : null}
      <Button type="submit" loading={pending} block>
        Create account
      </Button>
      <p className="text-sm text-ink-secondary">
        Already have an account? <Link href="/login" className="font-semibold">Sign in</Link>
      </p>
    </form>
  );
}

// ---------- Sign-up privacy note ----------
// Shown above "Create account". The owner's wording, plus the question-context clause the "only" needs to stay true.
const PRIVACY_NOTE: React.ReactNode = (
  <>
    By creating an account, you agree that Iskolar will use your answers (like your course, GWA and household income range) only to show which
    scholarships may fit you, to send the reminders you choose, and to tell the scholarship office your program and year when you ask a question.
    We don&apos;t sell your information. <Link href="/privacy">Read how we handle your data</Link>.
  </>
);

// ---------- Send the email again (60-second cooldown) ----------

const COOLDOWN = 60;

export function ResendForm({
  email,
  askEmail = false,
  startCooling = false,
  send = resendConfirmation,
}: {
  email?: string;
  askEmail?: boolean;
  startCooling?: boolean;
  /** The action that sends the email: the confirmation link by default, or the reset link. */
  send?: typeof resendConfirmation;
}) {
  const [state, action, pending] = useActionState(send, idle);
  const ref = useFocusResult<HTMLFormElement>(state);
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
    <form ref={ref} action={action} noValidate className="flex flex-col gap-4">
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
  const ref = useFocusResult<HTMLDivElement>(state);
  // Once sent, the form gives way to "check your email": each new link cancels the last one, so
  // sending again waits out the same cooldown as the confirmation email.
  if (state.status === "success") {
    return (
      <div ref={ref} className="flex flex-col gap-6">
        <FormMessage state={state} />
        <InboxHelp subject="Reset your Iskolar password" />
        <ResendForm email={state.values?.email} startCooling send={requestPasswordReset} />
        <p className="text-sm text-ink-secondary">
          Remembered it? <Link href="/login" className="font-semibold">Back to sign in</Link>
        </p>
      </div>
    );
  }
  return (
    <div ref={ref}>
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
          Send reset link
        </Button>
        <p className="text-sm text-ink-secondary">
          Remembered it? <Link href="/login" className="font-semibold">Sign in</Link>
        </p>
      </form>
    </div>
  );
}

// ---------- New password ----------

export function NewPasswordForm({ cancelHref }: { cancelHref: string }) {
  const [state, action, pending] = useActionState(updatePassword, idle);
  const ref = useFocusResult<HTMLFormElement>(state);
  return (
    <form ref={ref} action={action} noValidate className="flex flex-col gap-6">
      <FormMessage state={state} />
      <PasswordField label="New password" name="password" autoComplete="new-password" rules error={state.fieldErrors?.password} />
      <Button type="submit" loading={pending} block>
        Save new password
      </Button>
      <p className="text-caption text-ink-hint">Saving signs you out on your other devices.</p>
      <Link href={cancelHref} className="self-start text-sm font-semibold">
        Cancel, keep my password
      </Link>
    </form>
  );
}
