// Staff workflow end to end: a coordinator drafts a listing, an admin publishes it, a student sees it;
// questions and announcements reach the student.
import { expect, test } from "@playwright/test";
import { adminClient, createUser, signIn, waitForHydration } from "./support";

test.afterAll(async () => {
  await adminClient().from("scholarships").delete().like("slug", "e2e-%");
});

test("coordinator drafts → admin verifies and publishes → students see it", async ({ page, browser }) => {
  const coordinator = await createUser("coordinator", "wf-coord");
  const slug = `e2e-wf-${Date.now()}`;
  await signIn(page, coordinator.email);
  await page.goto("/staff/listings/new");
  await waitForHydration(page);

  // Validation first
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("Name: at least 3 characters.")).toBeVisible();
  // Focus lands on the first invalid field, which carries its error; no untouched document row errors.
  await expect(page.getByLabel("Scholarship name")).toBeFocused();
  await expect(page.getByLabel("Scholarship name")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("things to fix below.")).toBeVisible();
  await expect(page.getByText("Document name: can't be empty.")).toHaveCount(0);

  await page.getByLabel("Scholarship name").fill("E2E Engineering Bridge Grant");
  await page.getByLabel("Web address").fill(slug);
  await page.getByLabel("Provider", { exact: true }).selectOption({ label: "Commission on Higher Education (CHED)" });
  await page.getByLabel("Amount, as students read it").fill("₱12,000 a year");
  await page.getByLabel("Applications open").fill("2026-01-05");
  await page.getByLabel(/^Deadline/).fill("2030-12-20");
  await page.getByLabel("Source name").fill("CHED memo (E2E)");
  await page.getByLabel("Engineering").check();
  await page.getByRole("button", { name: "Add a document" }).click();
  await page.getByLabel("Document 1", { exact: true }).fill("Certificate of Registration (COR)");
  await page.getByLabel("Where to get it 1", { exact: true }).fill("Registrar’s office");
  await page.getByRole("button", { name: "Create draft" }).click();

  await expect(page).toHaveURL(/\/staff\/listings\/[0-9a-f-]+\?saved=1/);
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await expect(page.getByText(/Coordinator: Test Coordinator/)).toBeVisible();

  // Move the deadline: recorded in the history
  await page.getByLabel(/^Deadline/).fill("2030-12-27");
  // Status actions wait until the edit is saved.
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send for verification" })).toBeDisabled();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(/Dec 20, 2030 → Dec 27, 2030/)).toBeVisible();

  await page.getByRole("button", { name: "Send for verification" }).click();
  await expect(page.getByText("Sent for review", { exact: true })).toBeVisible();
  const editUrl = page.url().split("?")[0]!;

  // Not public yet
  const visitor = await browser.newContext();
  const vPage = await visitor.newPage();
  expect((await vPage.goto(`/s/${slug}`))?.status()).toBe(404);

  // Admin verifies and publishes
  const admin = await createUser("admin", "wf-admin");
  const adminCtx = await browser.newContext();
  const aPage = await adminCtx.newPage();
  await signIn(aPage, admin.email);
  await aPage.goto(editUrl);
  await waitForHydration(aPage);
  await aPage.getByRole("button", { name: "Verify against the source" }).click();
  await expect(aPage.getByText(/^Verified /)).toBeVisible();
  await aPage.getByRole("button", { name: "Publish" }).click();
  await aPage.getByRole("dialog", { name: "Publish this listing?" }).getByRole("button", { name: "Publish" }).click();
  await expect(aPage.getByText("Published", { exact: true })).toBeVisible();

  // Public now (the cache was revalidated by the staff action)
  await vPage.goto(`/s/${slug}`);
  await expect(vPage.getByRole("heading", { level: 1, name: "E2E Engineering Bridge Grant" })).toBeVisible();
  await expect(vPage.getByText("Taking a course in Engineering")).toBeVisible();

  // Clean up through the app, so the public cache is revalidated too.
  await aPage.goto(editUrl);
  await waitForHydration(aPage);
  await aPage.getByRole("button", { name: "Delete", exact: true }).click();
  await aPage.getByRole("dialog").getByRole("button", { name: "Delete permanently" }).click();
  await expect(aPage).toHaveURL(/\/staff\/listings$/);
  expect((await vPage.goto(`/s/${slug}`))?.status()).toBe(404);
  await visitor.close();
  await adminCtx.close();
});

test("a student's question gets a staff reply; announcements reach the dashboard", async ({ page, browser }) => {
  const student = await createUser("student", "wf-student");
  const coordinator = await createUser("coordinator", "wf-reply");
  const question = `Is the COR enough? (${Date.now()})`;
  const title = `E2E notice ${Date.now()}`;

  await signIn(page, student.email);
  await page.goto("/help");
  await waitForHydration(page);
  await page.getByLabel("Your question").fill(question);
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Question sent." })).toBeVisible();

  const staff = await browser.newContext();
  const sPage = await staff.newPage();
  await signIn(sPage, coordinator.email);
  await sPage.goto("/staff/inquiries?status=open&size=50");
  await waitForHydration(sPage);
  const item = sPage.locator("li").filter({ hasText: question });
  await item.getByRole("button", { name: "Reply" }).click();
  await expect(item.getByLabel("Reply")).toBeFocused();
  await item.getByLabel("Reply").fill("Yes, the COR from your student portal is fine.");
  await item.getByRole("button", { name: "Send reply" }).click();
  await expect(sPage.getByRole("status").filter({ hasText: "Reply sent." })).toBeVisible();

  await sPage.goto("/staff/announcements");
  await waitForHydration(sPage);
  // An empty post says what to fix and focuses the first field.
  await sPage.getByRole("button", { name: "Post announcement" }).click();
  await expect(sPage.getByText("2 things to fix below.")).toBeVisible();
  await expect(sPage.getByLabel("Title").first()).toBeFocused();
  await sPage.getByLabel("Title").first().fill(title);
  await sPage.getByLabel("Message").first().fill("Forms are at window 3 this week.");
  await sPage.getByRole("button", { name: "Post announcement" }).click();
  await expect(sPage.getByRole("status").filter({ hasText: "Announcement posted." })).toBeVisible();
  await staff.close();

  await page.goto("/help");
  await expect(page.getByText("Yes, the COR from your student portal is fine.")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText(title)).toBeVisible();
});

test("the browser Back button asks before leaving unsaved listing edits", async ({ page }) => {
  const admin = await createUser("admin", "back-guard");
  await signIn(page, admin.email);
  await page.goto("/staff/listings?q=Tulong");
  await waitForHydration(page);
  await page.locator("table").getByRole("link", { name: "Edit Tulong Dunong Program" }).click();
  await expect(page.getByLabel("Scholarship name")).toHaveValue("Tulong Dunong Program");
  const editorUrl = page.url();
  await page.getByLabel("Scholarship name").fill("Tulong Dunong Program (edited)");
  await expect(page.getByText("Unsaved changes")).toBeVisible();

  // Cancel: stays on the editor with the edit intact.
  page.once("dialog", (d) => d.dismiss());
  await page.evaluate(() => history.back());
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await expect(page).toHaveURL(editorUrl);
  await expect(page.getByLabel("Scholarship name")).toHaveValue("Tulong Dunong Program (edited)");

  // OK: goes back to the list; nothing was saved.
  page.once("dialog", (d) => d.accept());
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/staff\/listings\?q=Tulong$/);
  expect((await adminClient().from("scholarships").select("name").eq("slug", "tulong-dunong-program").single()).data?.name).toBe("Tulong Dunong Program");
});
