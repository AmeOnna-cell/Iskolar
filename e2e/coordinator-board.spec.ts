import { expect, test } from "@playwright/test";
import { adminClient, createUser, signIn, waitForHydration } from "./support";

test("coordinator can open read-only listings and post to an assigned scholarship", async ({ page }) => {
  test.setTimeout(180_000);
  page.setDefaultNavigationTimeout(60_000);
  const admin = adminClient();
  const coordinator = await createUser("coordinator", "assigned-board");
  const stamp = Date.now();
  const assignedName = `Assigned scholarship ${stamp}`;
  const otherName = `Read-only scholarship ${stamp}`;
  const title = `Assigned scholarship update ${stamp}`;
  let ids: string[] = [];
  try {
    const { data: provider } = await admin.from("providers").select("id").limit(1).single();
    const { data: listings, error } = await admin.from("scholarships").insert([
      { name: assignedName, slug: `e2e-assigned-${stamp}`, assigned_coordinator_id: coordinator.id, provider_id: provider!.id, amount_text: "Award pending", source_label: "Test listing", listing_status: "published" },
      { name: otherName, slug: `e2e-unassigned-${stamp}`, assigned_coordinator_id: null, provider_id: provider!.id, amount_text: "Award pending", source_label: "Test listing", listing_status: "published" },
    ]).select("id, slug");
    expect(error).toBeNull();
    ids = listings!.map(({ id }) => id);
    await signIn(page, coordinator.email);
    await page.goto("/staff/listings?size=50");
    await waitForHydration(page);
    const row = page.getByRole("row").filter({ hasText: otherName });
    await row.click({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: otherName })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/viewing this listing in read-only mode/)).toBeVisible();
    await expect(page.getByText("Award pending")).toBeVisible();

    const assigned = listings!.find((listing) => listing.slug === `e2e-assigned-${stamp}`)!;
    await page.goto(`/staff/listings/${assigned.id}`);
    await expect(page.getByText("Award pending")).toBeVisible();
    await expect(page.getByLabel("Scholarship name")).toHaveCount(0);
    await page.getByRole("link", { name: "Edit listing", exact: true }).click();
    await expect(page.getByLabel("Scholarship name")).toHaveValue(assignedName, { timeout: 20_000 });
    await page.getByRole("link", { name: "Back to view", exact: true }).click();
    await expect(page.getByLabel("Scholarship name")).toHaveCount(0);

    await page.goto("/staff/inquiries");
    await expect(page.getByRole("heading", { name: "Student questions" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search student questions" })).toBeVisible();

    await page.goto(`/staff/announcements?a=e2e-assigned-${stamp}`);
    await waitForHydration(page);
    await page.getByRole("button", { name: "New announcement" }).click();
    const dialog = page.getByRole("dialog", { name: "Post an announcement" });
    const topic = dialog.getByRole("combobox", { name: "About a scholarship" });
    await expect(topic).toHaveValue(assignedName);
    await topic.click();
    await expect(dialog.getByRole("option", { name: otherName })).toHaveCount(0);
    await topic.press("Escape");
    await dialog.getByLabel("Title").fill(title);
    await dialog.getByLabel("Message").fill("Bring the original form to your interview.");
    await dialog.getByRole("button", { name: "Post announcement", exact: true }).click();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible({ timeout: 20_000 });
  } finally {
    if (ids.length) {
      await admin.from("announcements").delete().in("scholarship_id", ids);
      await admin.from("scholarships").delete().in("id", ids);
    }
    await admin.auth.admin.deleteUser(coordinator.id);
  }
});
