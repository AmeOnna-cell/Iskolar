import { describe, expect, it, vi } from "vitest";
import { dispatch, renderNotificationEmail, type DispatchDeps, type NotificationRow, type Recipient } from "./dispatch";
import type { Json } from "@/lib/supabase/database.types";

const row = (over: Partial<NotificationRow> = {}): NotificationRow => ({
  id: "n1",
  user_id: "u1",
  kind: "deadline",
  title: "Tulong Dunong Program closes in 3 days",
  body: "2 documents still to prepare.",
  link: "/s/tdp",
  dedupe_key: "deadline:x",
  read_at: null,
  email_status: "pending",
  email_attempts: 0,
  email_error: null,
  emailed_at: null,
  push_status: "skipped",
  push_error: null,
  created_at: "2026-11-04T00:00:00Z",
  claimed_at: "2026-11-04T00:00:00Z",
  payload: { scholarship_name: "Tulong Dunong Program", provider_name: "CHED", closes_on: "2026-11-07", documents_left: 2, documents_total: 5, path: "/s/tdp" },
  ...over,
});

const ana: Recipient = { email: "ana@iskolar.test", name: "Ana Reyes", active: true, wantsEmail: true, wantsPush: true };

function deps(over: Partial<DispatchDeps> = {}, people: Record<string, Recipient> = { u1: ana }) {
  const updates: Array<[string, Record<string, unknown>]> = [];
  const d: DispatchDeps = {
    appUrl: "https://iskolar.example.com",
    today: "2026-11-04",
    emailBudget: 10,
    recipients: async () => new Map(Object.entries(people)),
    subscriptions: async () => [{ id: "s1", userId: "u1", endpoint: "https://push.example/1", p256dh: "k", auth: "a" }],
    sendEmail: vi.fn(async () => ({ ok: true as const, messageId: "m", attempts: 1 })),
    sendPush: vi.fn(async () => ({ ok: true as const })),
    removeSubscription: vi.fn(async () => {}),
    update: async (id, patch) => void updates.push([id, patch as Record<string, unknown>]),
    now: () => new Date("2026-11-04T01:00:00Z"),
    ...over,
  };
  return { d, updates };
}

describe("dispatch", () => {
  it("emails a reminder with the documents left and recomputed days", async () => {
    const { d, updates } = deps();
    const sum = await dispatch([row()], d);
    expect(sum.emailed).toBe(1);
    const msg = vi.mocked(d.sendEmail).mock.calls[0]![0];
    expect(msg.to).toBe("ana@iskolar.test");
    expect(msg.subject).toBe("Tulong Dunong Program closes in 3 days");
    expect(msg.text).toContain("2 of 5 documents");
    expect(msg.text).toContain("/settings/notifications");
    expect(updates[0]![1]).toMatchObject({ email_status: "sent", email_attempts: 1, emailed_at: "2026-11-04T01:00:00.000Z" });
  });

  it("respects preferences and account status at send time", async () => {
    const { d, updates } = deps({}, { u1: { ...ana, wantsEmail: false }, u2: { ...ana, active: false } });
    await dispatch([row(), row({ id: "n2", user_id: "u2" })], d);
    expect(d.sendEmail).not.toHaveBeenCalled();
    expect(updates.map(([, p]) => p.email_status)).toEqual(["skipped", "skipped"]);
  });

  it("skips a reminder once the deadline has passed", async () => {
    const { d, updates } = deps({ today: "2026-11-08" });
    await dispatch([row()], d);
    expect(d.sendEmail).not.toHaveBeenCalled();
    expect(updates[0]![1].email_status).toBe("skipped");
  });

  it("defers past the daily budget instead of failing", async () => {
    const { d, updates } = deps({ emailBudget: 1 });
    const sum = await dispatch([row(), row({ id: "n2" })], d);
    expect(sum).toMatchObject({ emailed: 1, deferred: 1 });
    expect(updates.map(([id]) => id)).toEqual(["n1"]); // n2 untouched: still pending
  });

  it("retries a temporary failure, then gives up after 3 attempts", async () => {
    const fail = vi.fn(async () => ({ ok: false as const, attempts: 3, error: { code: "ETIMEDOUT", message: "timeout", retryable: true } }));
    const first = deps({ sendEmail: fail });
    await dispatch([row()], first.d);
    expect(first.updates[0]![1]).toMatchObject({ email_attempts: 1, email_error: "ETIMEDOUT: timeout" });
    expect(first.updates[0]![1].email_status).toBeUndefined(); // stays pending
    const last = deps({ sendEmail: fail });
    await dispatch([row({ email_attempts: 2 })], last.d);
    expect(last.updates[0]![1]).toMatchObject({ email_status: "failed", email_attempts: 3 });
  });

  it("pushes to each device and removes subscriptions the browser revoked", async () => {
    const sendPush = vi.fn<DispatchDeps["sendPush"]>(async () => ({ ok: false as const, gone: true, error: "push 410: gone" }));
    const { d, updates } = deps({ sendPush });
    await dispatch([row({ email_status: "skipped", push_status: "pending" })], d);
    expect(JSON.parse(vi.mocked(sendPush).mock.calls[0]![1])).toEqual({ title: "Tulong Dunong Program closes in 3 days", body: "2 documents still to prepare.", link: "/s/tdp", tag: "n1" });
    expect(d.removeSubscription).toHaveBeenCalledWith("s1");
    expect(updates[0]![1]).toMatchObject({ push_status: "failed", push_error: "push 410: gone" });
  });
});

describe("renderNotificationEmail", () => {
  const at = (kind: NotificationRow["kind"], payload: { [k: string]: Json }) =>
    renderNotificationEmail(row({ kind, payload, link: "/s/x" }), "https://iskolar.example.com", "Ana", "2026-11-04")!;
  it("picks the template for each kind", () => {
    expect(at("change", { change: "deadline", scholarship_name: "TDP", provider_name: "CHED", previous_closes_on: "2026-11-20", new_closes_on: "2026-11-15" }).subject).toMatch(/^Deadline moved: TDP now closes .*Nov 15, 2026$/);
    expect(at("change", { change: "requirements", scholarship_name: "TDP", provider_name: "CHED" }).subject).toBe("Requirements updated: TDP");
    expect(at("new", { scholarship_name: "TES", provider_name: "UniFAST", amount: "₱20,000", verdict: "yes" }).subject).toBe("New scholarship you qualify for: TES");
    expect(at("announce", { title: "Forms at window 3", body: "This week only.", from: "City Scholarship Office" }).text).toContain("Posted by City Scholarship Office");
  });
});
