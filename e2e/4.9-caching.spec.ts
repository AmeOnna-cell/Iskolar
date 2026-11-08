// 4.9 Caching: public listing pages come from the tagged data cache and are refreshed by staff edits;
// per-user pages are never cached.
import { expect, test } from "@playwright/test";
import { adminClient, createUser, signIn, waitForHydration } from "./support";

test("a staff edit refreshes the cached public pages; personal pages are never cached", async ({ page, browser }) => {
  test.setTimeout(60_000);
  // Personal pages: no-store, so no shared or browser cache keeps them.
  const student = await createUser("student", "cache-student");
  await signIn(page, student.email);
  for (const path of ["/dashboard", "/applications", "/alerts"]) {
    expect((await page.request.get(path)).headers()["cache-control"], path).toContain("no-store");
  }
  await page.context().clearCookies();

  // A visitor warms the public cache.
  const visitorCtx = await browser.newContext();
  const visitor = await visitorCtx.newPage();
  await visitor.goto("/s/provincial-allied-health-grant");
  const before = (await adminClient().from("scholarships").select("id, amount_text").eq("slug", "provincial-allied-health-grant").single()).data!;
  await expect(visitor.getByText(before.amount_text).first()).toBeVisible();

  // An admin changes the amount through the app, which revalidates the "scholarships" tag...
  const admin = await createUser("admin", "cache-admin");
  await signIn(page, admin.email);
  await page.goto(`/staff/listings/${before.id}`);
  await waitForHydration(page);
  const amount = `₱${Date.now() % 100000} a year (cache check)`;
  await page.getByLabel("Amount, as students read it").fill(amount);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\?saved=1/);

  // ...and the visitor sees it on the next load, on the detail page and in search.
  await visitor.goto("/s/provincial-allied-health-grant");
  await expect(visitor.getByText(amount).first()).toBeVisible();
  await visitor.goto("/explore?q=Provincial");
  await expect(visitor.getByText(amount).first()).toBeVisible();
  await visitorCtx.close();

  // Put it back the same way, so the public cache is refreshed again.
  await waitForHydration(page);
  await page.getByLabel("Amount, as students read it").fill(before.amount_text);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.getByLabel("Amount, as students read it")).toHaveValue(before.amount_text);
});
