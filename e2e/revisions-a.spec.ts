// Team-leader revisions, group A: combobox, Share, scrollable side panel, tab row overflow, compact phone footer.
// (The dashboard button's destination and label are unit-tested in src/lib/dashboard.test.ts.)
import { expect, test } from "@playwright/test";
import { createUser, signIn, waitForHydration } from "./support";

test("long dropdowns are type-to-search comboboxes that work by keyboard and post their value", async ({ page }) => {
  await page.goto("/");
  await waitForHydration(page);
  const box = page.getByRole("combobox", { name: "Course area" });
  await box.click();
  await expect(box).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("option")).toHaveCount(9); // "Any course" + 8 course areas

  // Typing filters; arrows move the active option; Enter picks it without submitting the form.
  await box.fill("engin");
  await expect(page.getByRole("option")).toHaveText(["Engineering"]);
  await box.press("ArrowDown");
  await box.press("Enter");
  await expect(box).toHaveValue("Engineering");
  await expect(box).toHaveAttribute("aria-expanded", "false");
  await expect(page).toHaveURL(/\/$/);

  // Esc closes and restores the chosen label.
  await box.fill("zzz");
  // A miss says so and keeps the whole list in reach; Enter doesn't pick anything by accident.
  await expect(page.getByRole("option").first()).toHaveText("No matches for “zzz”. Choose from the list:");
  await expect(page.getByRole("option")).toHaveCount(10);
  await box.press("Enter");
  await expect(box).toHaveAttribute("aria-expanded", "true");
  await box.press("Escape");
  await expect(box).toHaveValue("Engineering");
  await expect(box).toHaveAttribute("aria-expanded", "false");

  // Students' own words find the category; leaving the box with one match picks it.
  await box.fill("nursing");
  await expect(page.getByRole("option")).toHaveText(["Health Sciences"]);
  await page.getByRole("combobox", { name: "Scholarship or provider", exact: true }).focus();
  await expect(box).toHaveValue("Health Sciences");

  await page.getByRole("button", { name: "Find scholarships" }).click();
  await expect(page).toHaveURL(/\/explore\?.*field=health_sciences/);
});

test.describe("Share", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("opens a share dialog with a QR code and the public link", async ({ page }) => {
    await page.goto("/s/tulong-dunong-program");
    await waitForHydration(page);
    const share = page.getByRole("button", { name: "Share" });
    await share.click();
    const dialog = page.getByRole("dialog", { name: "Share scholarship" });
    await expect(dialog.getByText("Tulong Dunong Program", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("img", { name: "Public scholarship link" })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Public scholarship link" })).toHaveValue(/\/s\/tulong-dunong-program$/);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(share).toBeFocused();
  });

  test("copies the link from the share dialog and says so", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/explore");
    await waitForHydration(page);
    const panel = page.getByRole("complementary", { name: "Selected scholarship" });
    const slug = await panel.getByRole("heading", { level: 2 }).first().getByRole("link").getAttribute("href");
    await panel.getByRole("button", { name: "Share" }).click();
    const dialog = page.getByRole("dialog", { name: "Share scholarship" });
    await dialog.getByRole("button", { name: "Copy link" }).click();
    await expect(dialog.getByRole("status")).toHaveText("Link copied");
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(new URL(copied).pathname).toBe(slug);
    // The shared link opens that scholarship.
    await page.goto(copied);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test("the side panel stays visible at the end of the results and scrolls independently", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/explore");
  await waitForHydration(page);
  const panel = page.getByRole("complementary", { name: "Selected scholarship" });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const topbar = page.locator("body > header");
  await expect.poll(async () => {
    const bounds = await panel.boundingBox();
    const bar = await topbar.boundingBox();
    return !!bounds && !!bar && bounds.y >= bar.y + bar.height && bounds.y + bounds.height <= 800;
  }).toBe(true);

  const pageScroll = await page.evaluate(() => window.scrollY);
  const header = panel.getByTestId("panel-header");
  const before = (await header.boundingBox())!;
  await panel.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect.poll(() => panel.evaluate((el) => el.scrollTop)).toBeGreaterThan(200);
  expect((await header.boundingBox())!.y).toBeLessThan(before.y - 100);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll);
});

test("My applications opens a tracking status dialog; the phone footer is compact", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const student = await createUser("student", "tabs");
  await signIn(page, student.email);
  await page.goto("/applications");
  await page.getByRole("button", { name: "Filter by tracking status" }).click();
  const dialog = page.getByRole("dialog", { name: "Tracking status" });
  await expect(dialog.getByRole("link", { name: "All scholarships" })).toHaveAttribute("aria-current", "true");
  await dialog.getByRole("link", { name: "Preparing" }).click();
  await expect(page).toHaveURL(/tab=preparing/);

  const footer = page.locator("footer");
  expect((await footer.boundingBox())!.height).toBeLessThan(240);
  await expect(footer.getByRole("link", { name: "Privacy" })).toBeVisible();
});
