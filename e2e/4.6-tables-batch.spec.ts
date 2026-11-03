// 4.6 Server-side pagination with URL state, and batch actions with per-row results.
import { expect, test } from "@playwright/test";
import { adminClient, createUser, signIn, waitForHydration } from "./support";

async function makeDrafts(n: number, tag: string) {
  const admin = adminClient();
  const { data: ched } = await admin.from("providers").select("id").eq("abbr", "CHED").single();
  const rows = Array.from({ length: n }, (_, i) => ({
    slug: `e2e-${tag}-${i + 1}-${Date.now()}`,
    provider_id: ched!.id,
    name: `E2E ${tag} listing ${String(i + 1).padStart(2, "0")}`,
    amount_text: "₱1,000",
    source_label: "E2E test",
    listing_status: "draft" as const,
  }));
  const { data, error } = await admin.from("scholarships").insert(rows).select("id, name");
  if (error) throw error;
  return data!;
}

test("listings table pages on the server and keeps state in the URL", async ({ page }) => {
  await makeDrafts(12, "page");
  const admin = await createUser("admin", "paging");
  await signIn(page, admin.email);

  await page.goto("/staff/listings?q=E2E%20page&size=10&sort=name&dir=asc");
  await expect(page.getByTestId("range")).toHaveText("1–10 of 12");
  await expect(page.locator("table tbody tr")).toHaveCount(10);
  await expect(page.locator("table tbody tr").first()).toContainText("E2E page listing 01");

  await page.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByTestId("range")).toHaveText("11–12 of 12");
  await expect(page.locator("table tbody tr")).toHaveCount(2);

  // Page size and sort direction are URL state too.
  await page.goto("/staff/listings?q=E2E%20page&size=25&sort=name&dir=desc");
  await expect(page.getByTestId("range")).toHaveText("1–12 of 12");
  await expect(page.locator("table tbody tr").first()).toContainText("E2E page listing 12");
});

test("batch actions run per row and report what didn't change", async ({ page }) => {
  const drafts = await makeDrafts(3, "batch");
  const admin = await createUser("admin", "batch");
  await signIn(page, admin.email);
  await page.goto("/staff/listings?q=E2E%20batch&sort=name&dir=asc");
  await waitForHydration(page);

  await page.getByRole("checkbox", { name: "Select all listings on this page" }).check();
  await expect(page.getByRole("region", { name: "Batch actions" })).toContainText("3 selected");
  await page.getByRole("region", { name: "Batch actions" }).getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("status").filter({ hasText: "3 listings verified." })).toBeVisible();
  await expect(page.locator("table tbody")).not.toContainText("Unverified");

  // Mixed batch: archive one first, then "Archive" all three → 2 archived, 1 not changed.
  await adminClient().from("scholarships").update({ listing_status: "archived" }).eq("id", drafts[0]!.id);
  await page.reload();
  await waitForHydration(page);
  await page.getByRole("checkbox", { name: "Select all listings on this page" }).check();
  await page.getByRole("region", { name: "Batch actions" }).getByRole("button", { name: "Archive" }).click();
  const report = page.getByRole("alert").filter({ hasText: "2 listings archived, 1 not changed." });
  await expect(report).toBeVisible();
  await expect(report).toContainText(`${drafts[0]!.name}: Not changed`);

  // One audit row per item
  const { count } = await adminClient().from("audit_logs").select("id", { count: "exact", head: true }).eq("action", "scholarship.verify").in("entity_id", drafts.map((d) => d.id));
  expect(count).toBe(3);
});

test("coordinators only get the actions their role allows", async ({ page }) => {
  await makeDrafts(1, "coordactions");
  const coordinator = await createUser("coordinator", "coordactions");
  await signIn(page, coordinator.email);
  await page.goto("/staff/listings?q=E2E%20coordactions");
  await waitForHydration(page);
  await page.getByRole("checkbox", { name: /^Select E2E coordactions/ }).check();
  const bar = page.getByRole("region", { name: "Batch actions" });
  await expect(bar.getByRole("button", { name: "Send for verification" })).toBeVisible();
  for (const name of ["Verify", "Publish", "Archive", "Delete"]) await expect(bar.getByRole("button", { name, exact: true })).toHaveCount(0);
  // Not assigned to this coordinator: they can view it but not edit it.
  await expect(page.getByRole("link", { name: /^Edit/ })).toHaveCount(0);
});
