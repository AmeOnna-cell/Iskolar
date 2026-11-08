// Team-leader revisions, group B: filter drawer, the new scholarship card, and the phone details drawer.
import { expect, test } from "@playwright/test";
import { waitForHydration } from "./support";

const count = (page: import("@playwright/test").Page) => page.getByTestId("result-count");

test("filters live in a drawer: Done applies, Esc and Back discard, Clear all resets, focus returns", async ({ page }) => {
  await page.goto("/explore");
  await waitForHydration(page);
  const button = page.getByRole("button", { name: "Filters", exact: true });
  // Other specs may publish listings first, so compare with the starting count, not a fixed number.
  await expect(count(page)).toHaveText(/\d+ scholarships/);
  const all = (await count(page).textContent())!;

  // Open: the drawer is in the URL; Esc closes it, discards the draft and returns focus.
  await button.click();
  const drawer = page.getByRole("dialog", { name: "Filters" });
  await expect(drawer).toBeVisible();
  await expect(page).toHaveURL(/filters=1/);
  await drawer.getByRole("radio", { name: "Closed" }).check();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(button).toBeFocused();
  await expect(count(page)).toHaveText(all);

  // Back closes it too, without leaving the page.
  await button.click();
  await expect(drawer).toBeVisible();
  await page.goBack();
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(/\/explore$/);

  // Combobox inside: Esc closes only its list. Then two filters, Done applies both.
  await button.click();
  const course = drawer.getByRole("combobox", { name: "Course area" });
  await course.fill("nursing");
  await expect(drawer.getByRole("option", { name: "Health Sciences" })).toBeVisible();
  await course.press("Escape");
  await expect(drawer).toBeVisible();
  await course.fill("nursing");
  await course.press("ArrowDown");
  await course.press("Enter");
  await drawer.getByRole("group", { name: "Provider type" }).getByRole("radio", { name: "Government", exact: true }).check();
  await drawer.getByRole("button", { name: "Done" }).click();
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(/type=government&field=health_sciences/);
  await expect(page.getByTestId("filter-count")).toHaveText("2");

  // Applied filters are listed by name under the search box; each one can be removed on its own.
  const on = page.getByRole("group", { name: "Filters on" });
  await expect(on.getByRole("button", { name: /^Remove filter/ })).toHaveText(["Government", "Health Sciences"]);
  await on.getByRole("button", { name: "Remove filter: Health Sciences" }).click();
  await expect(page).toHaveURL(/\/explore\?type=government$/);
  await page.getByRole("button", { name: "Filters, 1 on" }).click();
  await drawer.getByRole("combobox", { name: "Course area" }).fill("nursing");
  await drawer.getByRole("option", { name: "Health Sciences" }).click();
  await drawer.getByRole("button", { name: "Done" }).click();
  await expect(page).toHaveURL(/type=government&field=health_sciences/);

  // Clear all, then Done: back to everything. Sort stayed outside the drawer the whole time.
  await page.getByRole("button", { name: "Filters, 2 on" }).click();
  await drawer.getByRole("button", { name: "Clear all filters" }).click();
  await expect(drawer.getByRole("combobox", { name: "Course area" })).toHaveValue("");
  await drawer.getByRole("button", { name: "Done" }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(count(page)).toHaveText(all);
  await expect(page.getByLabel("Sort by")).toBeVisible();
});

test("cards: amount with its period, location and provider type, deadline and posted date", async ({ page }) => {
  await page.goto("/explore?q=city%20educational");
  const card = page.getByTestId("scholarship-card").first();
  await expect(card.getByTestId("card-amount")).toHaveText("₱5,000 per semester");
  await expect(card).toContainText("Central Luzon (city residents)");
  await expect(card).toContainText("Local government");
  await expect(card).toContainText("Sample listing");
  await expect(card).toContainText(/Closes in \d+ days?|Closes today/);
  await expect(card).toContainText(/Posted /);
  await expect(card.getByRole("link", { name: "Sign in to save City Educational Assistance" })).toBeVisible();
});

test.describe("phones", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("tapping a card opens its details in a drawer; Back closes it and keeps the list's scroll", async ({ page }) => {
    await page.goto("/explore");
    await waitForHydration(page);
    const card = page.getByRole("link", { name: "President’s Academic Award", exact: true });
    await card.scrollIntoViewIfNeeded();
    const scrolled = await page.evaluate(() => window.scrollY);
    expect(scrolled).toBeGreaterThan(300);

    await card.click();
    const drawer = page.getByRole("dialog", { name: "President’s Academic Award" });
    await expect(drawer).toBeVisible();
    await expect(page).toHaveURL(/s=presidents-academic-award.*d=1|d=1.*s=presidents-academic-award/);
    await expect(drawer.getByRole("heading", { level: 2, name: "President’s Academic Award" })).toBeVisible();
    await expect(drawer.getByText("Sample listing").first()).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Open the full page" })).toHaveAttribute("href", "/s/presidents-academic-award");

    await page.goBack();
    await expect(drawer).toBeHidden();
    await expect(page).toHaveURL(/\/explore(\?s=presidents-academic-award)?$/);
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - scrolled)).toBeLessThan(40);
    await expect(card).toBeFocused();
  });

  test("cards and the list fit the phone: no sideways scroll, no selected ring without a side panel", async ({ page }) => {
    for (const route of ["/", "/explore"]) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
    }
    const first = page.getByTestId("scholarship-card").first();
    expect(await first.evaluate((el) => getComputedStyle(el).boxShadow)).not.toContain("rgb(37");
    // The location carries eligibility ("city residents"), so it wraps instead of being cut off.
    await page.goto("/explore?q=city%20educational");
    await expect(page.getByTestId("scholarship-card").first().getByText("Central Luzon (city residents)")).toBeInViewport();
  });

  test("the filter drawer is a bottom sheet with 16px inputs", async ({ page }) => {
    await page.goto("/explore");
    await waitForHydration(page);
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    // Measured once the slide-up animation has finished.
    await expect.poll(async () => {
      const b = (await sheet.boundingBox())!;
      return [b.x, Math.round(b.y + b.height)];
    }).toEqual([0, 740]);
    for (const input of await sheet.getByRole("combobox").all()) {
      expect(await input.evaluate((el) => getComputedStyle(el).fontSize)).toBe("16px");
    }
    expect(await page.getByLabel("Sort by").evaluate((el) => getComputedStyle(el).fontSize)).toBe("16px");
  });
});
