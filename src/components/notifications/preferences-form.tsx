"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { removePushSubscription, savePreferences, savePushSubscription } from "@/lib/actions/notifications";
import { idle } from "@/lib/validation/auth";

export type Prefs = { email: boolean; push: boolean; site: boolean; lead_days: number; new_matches: boolean; changes: boolean };

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyBytes(base64url: string) {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Asks for permission (only here, after the student chose push) and saves this browser's subscription. */
async function subscribe(): Promise<string | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "This browser doesn't support push notifications.";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "Notifications are blocked for this site. Allow them in your browser settings, then try again.";
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) }));
  const res = await savePushSubscription(sub.toJSON(), navigator.userAgent);
  return res.ok ? null : res.message ?? "Couldn't turn on push notifications.";
}

async function unsubscribe() {
  const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await removePushSubscription(sub.endpoint);
    await sub.unsubscribe();
  }
}

function Check({ name, label, hint, defaultChecked, disabled }: { name: string; label: string; hint?: string; defaultChecked: boolean; disabled?: boolean }) {
  return (
    <label className={`flex min-h-11 items-start gap-3 py-2 ${disabled ? "opacity-60" : ""}`}>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} disabled={disabled} className="mt-0.5 size-[18px] shrink-0 accent-[var(--primary)]" />
      <span>
        <span className="block text-base text-ink">{label}</span>
        {hint ? <span className="block text-caption [overflow-wrap:anywhere] text-ink-hint">{hint}</span> : null}
      </span>
    </label>
  );
}

export function PreferencesForm({ prefs, email }: { prefs: Prefs; email: string }) {
  const [state, action, saving] = useActionState(savePreferences, idle);
  const [pushError, setPushError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [channelsOff, setChannelsOff] = useState(!prefs.email && !prefs.push && !prefs.site);
  const formRef = useRef<HTMLFormElement>(null);
  const skipPush = useRef(false);
  const pushSupported = Boolean(VAPID);

  useEffect(() => {
    if (state.status !== "idle") setPushError(null);
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={async (e) => {
        // Push needs the browser's permission first: subscribe (or unsubscribe), then submit for real.
        if (skipPush.current) {
          skipPush.current = false;
          return;
        }
        const wantsPush = new FormData(e.currentTarget).get("push") === "on";
        if (wantsPush === prefs.push && !wantsPush) return;
        e.preventDefault();
        setWorking(true);
        setPushError(null);
        try {
          if (wantsPush) {
            const err = await subscribe();
            if (err) {
              setPushError(err);
              return;
            }
          } else {
            await unsubscribe();
          }
          skipPush.current = true;
          formRef.current?.requestSubmit();
        } catch {
          setPushError("Couldn't set up push notifications in this browser.");
        } finally {
          setWorking(false);
        }
      }}
      onChange={(e) => {
        const f = e.currentTarget;
        setChannelsOff(!["email", "push", "site"].some((n) => (f.elements.namedItem(n) as HTMLInputElement | null)?.checked));
      }}
      className="flex flex-col gap-6"
    >
      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-ink">Send alerts by</legend>
        <Check name="email" label="Email" hint={`To ${email}`} defaultChecked={prefs.email} />
        <Check
          name="push"
          label="Push notifications"
          hint={pushSupported ? "On this device. Your browser will ask for permission." : "Not available yet."}
          defaultChecked={prefs.push}
          disabled={!pushSupported}
        />
        <Check name="site" label="On-site alerts" hint="The bell and the Alerts page" defaultChecked={prefs.site} />
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="lead_days" className="text-sm font-semibold text-ink">Remind me before deadlines</label>
        <select id="lead_days" name="lead_days" defaultValue={String(prefs.lead_days)} className="min-h-11 rounded-sm border border-hairline-strong bg-surface px-3 text-base text-ink">
          {[1, 3, 7, 14].map((n) => (
            <option key={n} value={n}>{n === 1 ? "1 day before" : `${n} days before`}</option>
          ))}
        </select>
        <p className="text-caption text-ink-hint">For scholarships you saved or are preparing.</p>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-ink">Also notify me about</legend>
        <Check name="new_matches" label="New scholarships that match me" defaultChecked={prefs.new_matches} />
        <Check name="changes" label="Deadline or requirement changes" defaultChecked={prefs.changes} />
      </fieldset>

      {channelsOff ? (
        <Notice tone="warn" live>
          With every channel off you won&apos;t get deadline reminders. Your alerts history stays.
        </Notice>
      ) : null}
      {pushError ? <Notice tone="danger" live>{pushError}</Notice> : null}
      {state.status === "error" ? <Notice tone="danger" live>{state.message}</Notice> : null}
      {state.status === "success" ? <Notice tone="ok" live>{state.message}</Notice> : null}
      <Button type="submit" loading={saving || working}>Save settings</Button>
    </form>
  );
}
