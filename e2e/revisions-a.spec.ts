// Team-leader revisions, group A: combobox, Share, sticky panel header, tab row overflow, compact phone footer.
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
  await page.getByPlaceholder("Scholarship name or provider").focus();
  await expect(box).toHaveValue("Health Sciences");

  await page.getByRole("button", { name: "Find scholarships" }).click();
  await expect(page).toHaveURL(/\/explore\?.*field=health_sciences/);
});

test.describe("Share", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("uses the share sheet when there is one", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { configurable: true, value: async (d: ShareData) => void ((window as unknown as { __shared: ShareData }).__shared = d) });
    });
    await page.goto("/s/tulong-dunong-program");
    await waitForHydration(page);
    await page.getByRole("button", { name: "Share" }).click();
    const shared = await page.evaluate(() => (window as unknown as { __shared: ShareData }).__shared);
    expect(shared.url).toMatch(/\/s\/tulong-dunong-program$/);
    // Sample listings say so wherever they're shared: the share title and the link preview.
    expect(shared.title).toBe("Tulong Dunong Program (sample listing)");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Tulong Dunong Program (sample listing)");
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", /^Sample listing · Deadline /);
  });

  test("otherwise copies the link and says so", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => Object.defineProperty(navigator, "share", { configurable: true, value: undefined }));
    await page.goto("/explore");
    await waitForHydration(page);
    const panel = page.getByRole("complementary", { name: "Selected scholarship" });
    await panel.getByRole("button", { name: "Share" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Link copied" })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    const slug = await panel.getByRole("heading", { level: 2 }).first().getByRole("link").getAttribute("href");
    expect(new URL(copied).pathname).toBe(slug);
    // The shared link opens that scholarship.
    await page.goto(copied);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test("the side panel keeps its header and actions in view while the body scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/explore");
  const panel = page.getByRole("complementary", { name: "Selected scholarship" });
  const header = panel.getByTestId("panel-header");
  const before = (await header.boundingBox())!;
  await panel.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect.poll(() => panel.evaluate((el) => el.scrollTop)).toBeGreaterThan(200);
  const after = (await header.boundingBox())!;
  expect(Math.abs(after.y - before.y)).toBeLessThan(2);
  await expect(header.getByRole("button", { name: "Share" })).toBeInViewport();
});

test("My applications tab row has no vertical scrollbar; the phone footer is compact", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const student = await createUser("student", "tabs");
  await signIn(page, student.email);
  await page.goto("/applications");
  const tabs = page.getByRole("navigation", { name: "Application stages" });
  const { overflowY } = await tabs.evaluate((el) => ({ overflowY: el.scrollHeight - el.clientHeight }));
  expect(overflowY).toBe(0);
  expect(await tabs.evaluate((el) => getComputedStyle(el).overflowX)).toBe("auto");

  const footer = page.locator("footer");
  expect((await footer.boundingBox())!.height).toBeLessThan(240);
  await expect(footer.getByRole("link", { name: "Privacy" })).toBeVisible();
});
