// Shared E2E helpers: users via the Supabase Admin API (service role, test-only) and emails via
// the local Mailpit inbox that catches Supabase Auth emails (never real Gmail).
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export const PASSWORD = "Iskolar2026test";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("E2E needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from .env.local).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function uniqueEmail(tag: string) {
  return `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@iskolar.test`;
}

/** A confirmed account with the given role. */
export async function createUser(role: "student" | "coordinator" | "admin" = "student", tag: string = role) {
  const email = uniqueEmail(tag);
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `Test ${role[0]!.toUpperCase()}${role.slice(1)}` },
  });
  if (error) throw error;
  if (role !== "student") {
    const { error: roleError } = await admin.from("profiles").update({ role }).eq("id", data.user.id);
    if (roleError) throw roleError;
  }
  return { id: data.user.id, email, password: PASSWORD };
}

export async function setStatus(userId: string, status: "active" | "deactivated") {
  const { error } = await adminClient()
    .from("profiles")
    .update({ status, deactivated_at: status === "active" ? null : new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

/** Resolves once React has hydrated the page (Providers sets html[data-hydrated]). */
export async function waitForHydration(page: Page) {
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
}

/** The message inside the page's form (Next.js also renders a route announcer with role="alert"). */
export const formAlert = (page: Page) => page.locator("main").getByRole("alert");
export const formStatus = (page: Page) => page.locator("main").getByRole("status");

export async function signIn(page: Page, email: string, password = PASSWORD, path = "/login") {
  await page.goto(path);
  await waitForHydration(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

type MailSummary = { ID: string; Subject: string; Created: string };

/** Waits for the newest email to `to` (optionally with a subject) and returns its HTML. */
export async function waitForEmail(to: string, subject?: string, after = 0): Promise<{ html: string; subject: string }> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    if (res.ok) {
      const { messages } = (await res.json()) as { messages: MailSummary[] };
      const hit = messages.find((m) => (!subject || m.Subject === subject) && Date.parse(m.Created) >= after);
      if (hit) {
        const full = (await (await fetch(`${MAILPIT}/api/v1/message/${hit.ID}`)).json()) as { HTML: string; Subject: string };
        return { html: full.HTML, subject: full.Subject };
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email to ${to}${subject ? ` with subject "${subject}"` : ""} within 20s`);
}

/** The /auth/confirm link inside an Iskolar email, made relative to the app under test. */
export function confirmLink(html: string): string {
  const match = /href="([^"]*\/auth\/confirm\?[^"]+)"/.exec(html);
  expect(match, "email contains an /auth/confirm link").not.toBeNull();
  const url = new URL(match![1]!.replace(/&amp;/g, "&"));
  return url.pathname + url.search;
}
