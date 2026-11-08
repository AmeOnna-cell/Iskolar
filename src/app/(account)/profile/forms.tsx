"use client";

import { useActionState, useState } from "react";
import { FormMessage, useFocusResult } from "@/app/(auth)/forms";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { idle } from "@/lib/validation/auth";
import { changePassword, deleteMyAccount, updateName } from "./actions";

export function NameForm({ fullName }: { fullName: string }) {
  const [state, action, pending] = useActionState(updateName, idle);
  const ref = useFocusResult<HTMLFormElement>(state);
  return (
    <form ref={ref} action={action} noValidate className="flex flex-col gap-4">
      <FormMessage state={state} />
      <TextField
        label="Full name"
        name="fullName"
        autoComplete="name"
        maxLength={120}
        defaultValue={state.values?.fullName ?? fullName}
        error={state.fieldErrors?.fullName}
      />
      <Button type="submit" variant="outline" loading={pending} className="self-start">
        Save name
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, idle);
  const ref = useFocusResult<HTMLFormElement>(state);
  return (
    // A new key after success clears both fields.
    <form key={state.status === "success" ? state.message : "form"} ref={ref} action={action} noValidate className="flex flex-col gap-4">
      <FormMessage state={state} />
      <PasswordField label="Current password" name="current" autoComplete="current-password" error={state.fieldErrors?.current} />
      <PasswordField label="New password" name="password" autoComplete="new-password" rules error={state.fieldErrors?.password} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" variant="outline" loading={pending}>
          Change password
        </Button>
        <p className="text-sm text-ink-secondary">Signs you out on your other devices.</p>
      </div>
    </form>
  );
}

/** Danger zone: delete my own account, after typing my email and current password. */
export function DeleteAccount({ email, isStudent }: { email: string; isStudent: boolean }) {
  const [open, setOpen] = useState(false);
  const [opens, setOpens] = useState(0);
  return (
    <>
      <Button
        variant="outline-danger"
        onClick={() => {
          setOpens((n) => n + 1);
          setOpen(true);
        }}
        className="self-start"
      >
        Delete my account
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Delete your account?" description="This can't be undone.">
        {/* A new form each time the dialog opens: no error or typing left over from last time. */}
        <DeleteForm key={opens} email={email} isStudent={isStudent} onCancel={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function DeleteForm({ email, isStudent, onCancel }: { email: string; isStudent: boolean; onCancel: () => void }) {
  const [state, action, pending] = useActionState(deleteMyAccount, idle);
  const ref = useFocusResult<HTMLFormElement>(state);
  return (
    <form ref={ref} action={action} noValidate className="flex flex-col gap-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="font-semibold text-ink">Deleted</p>
              <ul className="mt-1 list-disc pl-5 text-ink-secondary">
                {isStudent ? (
                  <>
                    <li>Eligibility answers</li>
                    <li>Saved scholarships and checklists</li>
                    <li>Alerts and reminder settings</li>
                  </>
                ) : null}
                <li>Your name and email</li>
                <li>Every signed-in session</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-ink">Kept, without your name</p>
              <ul className="mt-1 list-disc pl-5 text-ink-secondary">
                {isStudent ? <li>Questions you sent</li> : <li>Listings, replies and announcements you made</li>}
                <li>The audit log entry</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-ink-secondary">
            <a href="/privacy#choices-h">How we handle your data</a>. Only want fewer emails?{" "}
            <a href="/profile#reminders" onClick={onCancel}>
              Change your reminders
            </a>{" "}
            instead.
          </p>
          <FormMessage state={state} />
          <TextField
            label="Type your email to confirm"
            name="email"
            type="email"
            autoComplete="off"
            inputMode="email"
            hint={<>Type <strong className="font-semibold [overflow-wrap:anywhere] text-ink">{email}</strong> exactly.</>}
            defaultValue={state.values?.email}
            error={state.fieldErrors?.email}
          />
          <PasswordField id="del-password" label="Current password" name="password" autoComplete="current-password" error={state.fieldErrors?.password} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Keep my account
            </Button>
            <Button type="submit" variant="danger" loading={pending}>
              Delete my account
            </Button>
          </div>
    </form>
  );
}
