// 4.10 Backend sorting and filtering: search/filter/sort run in the database, state lives in the URL,
// and the first page is server-rendered.
import { expect, test } from "@playwright/test";
import { waitForHydration } from "./support";

const cards = (page: import("@playwright/test").Page) => page.getByTestId("scholarship-card");

test("the first page is server-rendered (works without JavaScript)", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/explore?q=ched");
  await expect(page.getByTestId("result-count")).toHaveText("2 scholarships");
  await expect(page.getByRole("link", { name: "Tulong Dunong Program" }).first()).toBeVisible();
  await ctx.close();
});

test("search, filters and sort update the URL and the results", async ({ page }) => {
  await page.goto("/explore");
  await waitForHydration(page);
  await expect(page.getByTestId("result-count")).toHaveText("9 scholarships");

  // Debounced search
  await page.getByRole("searchbox", { name: "Search scholarships" }).fill("dost");
  await expect(page).toHaveURL(/\/explore\?q=dost$/);
  await expect(page.getByTestId("result-count")).toHaveText("1 scholarship");
  await expect(cards(page).first()).toContainText("DOST-SEI Junior Level Science Scholarship");

  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(page).toHaveURL(/\/explore$/);

  // Status filter
  await page.getByLabel("Status").selectOption("upcoming");
  await expect(page).toHaveURL(/status=upcoming/);
  await expect(page.getByTestId("result-count")).toHaveText("2 scholarships");

  // Sort by amount: DOST JLSS (₱124,000) before CHED Merit (₱120,000)
  await page.getByLabel("Sort by").selectOption("amount");
  await expect(page).toHaveURL(/status=upcoming&sort=amount/);
  await expect(cards(page).nth(0)).toContainText("DOST-SEI");
  await expect(cards(page).nth(1)).toContainText("CHED Merit");

  // A course filter keeps listings open to every course
  await page.goto("/explore?field=health_sciences");
  await expect(page.getByTestId("result-count")).toHaveText("7 scholarships");

  // The URL is the state: reload keeps it
  await page.goto("/explore?type=private");
  await expect(page.getByLabel("Provider type")).toHaveValue("private");
  await expect(page.getByTestId("result-count")).toHaveText("1 scholarship");
});

test("no results shows a way out", async ({ page }) => {
  await page.goto("/explore?q=zzznothingmatches");
  await expect(page.getByRole("heading", { name: "No scholarships match your search" })).toBeVisible();
  await page.getByRole("link", { name: "Clear all filters" }).click();
  await expect(page.getByTestId("result-count")).toHaveText("9 scholarships");
});
