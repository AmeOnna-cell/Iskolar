// 4.7 Notifications: reminders (idempotent), email through the dispatcher, the live badge,
// the Alerts page with bulk mark-as-read, and preferences being respected.
import { expect, test, type APIRequestContext } from "@playwright/test";
import { adminClient, createUser, signIn, waitForEmail, waitForHydration } from "./support";

const SECRET = process.env.CRON_SECRET ?? "";

async function listingClosingIn(days: number, tag: string) {
  const admin = adminClient();
  const { data: ched } = await admin.from("providers").select("id").eq("abbr", "CHED").single();
  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }) + "T00:00:00Z");
  const iso = (d: number) => new Date(today.getTime() + d * 86_400_000).toISOString().slice(0, 10);
  const slug = `e2e-${tag}-${Date.now()}`;
  const { data, error } = await admin
    .from("scholarships")
    .insert({ slug, provider_id: ched!.id, name: `E2E ${tag} Grant`, amount_text: "₱3,000", source_label: "E2E", listing_status: "published", opens_on: iso(-5), closes_on: iso(days) })
    .select("id, slug, name")
    .single();
  if (error) throw error;
  await admin.from("scholarship_documents").insert([
    { scholarship_id: data.id, position: 0, name: "Certificate of Registration" },
    { scholarship_id: data.id, position: 1, name: "Grades" },
  ]);
  return data;
}

const dispatchNow = (request: APIRequestContext) => request.post("/api/cron/dispatch", { headers: { Authorization: `Bearer ${SECRET}` } });

test.beforeAll(() => {
  if (SECRET.length < 16) throw new Error("Set CRON_SECRET (16+ characters) for the test server and this run.");
});

test("the delivery endpoint only answers the cron job", async ({ request }) => {
  expect((await request.post("/api/cron/dispatch")).status()).toBe(401);
  expect((await request.post("/api/cron/dispatch", { headers: { Authorization: "Bearer not-the-secret-value" } })).status()).toBe(401);
  expect((await request.get("/api/cron/dispatch")).status()).toBe(405);
});

test("deadline reminder: once per lead time, emailed with a preferences link, live badge, Alerts", async ({ page }) => {
  const student = await createUser("student", "remind");
  const listing = await listingClosingIn(2, "remind");
  const admin = adminClient();
  await admin.from("applications").insert({ student_id: student.id, scholarship_id: listing.id, stage: "preparing" });

  expect((await admin.rpc("enqueue_deadline_reminders")).error).toBeNull();
  await admin.rpc("enqueue_deadline_reminders"); // the job is idempotent
  const { data: mine } = await admin.from("notifications").select("title, body, email_status").eq("user_id", student.id).eq("kind", "deadline");
  expect(mine).toEqual([{ title: `${listing.name} closes in 2 days`, body: "2 documents still to prepare.", email_status: "pending" }]);

  const sentAt = Date.now() - 1000;
  const res = await dispatchNow(page.request);
  expect(res.status()).toBe(200);
  expect((await res.json()).emailed).toBeGreaterThanOrEqual(1);
  const email = await waitForEmail(student.email, `${listing.name} closes in 2 days`, sentAt);
  expect(email.html).toContain("2 of 2 documents");
  expect(email.html).toContain("/settings/notifications");
  const { data: after } = await admin.from("notifications").select("email_status").eq("user_id", student.id).eq("kind", "deadline").single();
  expect(after!.email_status).toBe("sent");

  // Badge: server count, then live through Realtime
  await signIn(page, student.email);
  await expect(page).toHaveURL(/\/dashboard$/);
  await waitForHydration(page);
  await expect(page.getByTestId("unread-badge")).toHaveText("1");
  await expect(page.locator('button[title="Alerts"][data-live="true"]')).toBeVisible(); // Realtime connected
  await admin.from("scholarships").update({ closes_on: new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10) }).eq("id", listing.id);
  await expect(page.getByTestId("unread-badge")).toHaveText("2"); // "deadline moved", no reload

  // Alerts: opening an alert marks it read and goes where it points
  await page.goto("/alerts?show=unread");
  await waitForHydration(page);
  await expect(page.getByTestId("unread-tab-count")).toHaveText("2");
  await expect(page.getByTestId("prefs-summary")).toHaveText("Email and on-site alerts, 7 days before deadlines.");
  await page.getByRole("link", { name: new RegExp(`${listing.name}: deadline moved`) }).click();
  await expect(page).toHaveURL(new RegExp(`/s/${listing.slug}$`));
  await expect(page.getByTestId("unread-badge")).toHaveText("1");
  await page.goto("/alerts?show=unread");
  await page.getByRole("link", { name: new RegExp(`${listing.name} closes in 2 days`) }).click();
  await expect(page).toHaveURL(new RegExp(`/s/${listing.slug}$`));
  await expect(page.getByTestId("unread-badge")).toHaveCount(0);
});

test("preferences are respected: email off means nothing is emailed; mark all as read", async ({ page }) => {
  const student = await createUser("student", "prefs");
  await signIn(page, student.email);
  await page.goto("/settings/notifications");
  await waitForHydration(page);
  await page.getByRole("checkbox", { name: /^Email/ }).uncheck();
  await page.getByLabel("Remind me before deadlines").selectOption("3");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Reminder settings saved." })).toBeVisible();

  const admin = adminClient();
  const { data: prefs } = await admin.from("notification_preferences").select("email, lead_days").eq("user_id", student.id).single();
  expect(prefs).toEqual({ email: false, lead_days: 3 });

  const title = `E2E notice ${Date.now()}`;
  await admin.from("announcements").insert({ title, body: "Forms are at window 3 this week.", posted_as: "City Scholarship Office" });
  const { data: n } = await admin.from("notifications").select("email_status, read_at").eq("user_id", student.id).eq("kind", "announce");
  expect(n).toEqual([{ email_status: "skipped", read_at: null }]);

  await page.goto("/alerts");
  await waitForHydration(page);
  await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page.getByRole("status").filter({ hasText: /marked as read/ })).toBeVisible();
  await expect(page.getByTestId("unread-badge")).toHaveCount(0);
});
