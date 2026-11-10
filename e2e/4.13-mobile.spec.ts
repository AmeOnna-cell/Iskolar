// 4.13 Mobile responsiveness: no sideways page scroll at the brief's four sizes, the bottom tab bar on
// phones, tables as cards, dialogs as sheets.
import { expect, test, type Page } from "@playwright/test";
import { VIEWPORTS } from "../playwright.config";
import { createUser, signIn, waitForHydration } from "./support";

const SIZES = Object.values(VIEWPORTS);
const PUBLIC = ["/", "/explore", "/s/tulong-dunong-program", "/help", "/login", "/signup"];
const STUDENT = ["/dashboard", "/check?step=1", "/applications", "/announcements", "/alerts", "/profile", "/s/tulong-dunong-program"];
const STAFF = ["/staff", "/staff/listings", "/staff/listings/new", "/staff/inquiries", "/staff/announcements", "/admin/users", "/admin/audit"];

/** Loads the route once, then checks every size (the layout is CSS-driven, so a resize is enough). */
async function expectNoSideScroll(page: Page, route: string) {
  await page.setViewportSize(VIEWPORTS.phone);
  await page.goto(route);
  await waitForHydration(page);
  for (const size of SIZES) {
    await page.setViewportSize(size);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${route} scrolls sideways at ${size.width}px`).toBeLessThanOrEqual(0);
  }
}

test("public pages fit every size", async ({ page }) => {
  test.setTimeout(90_000);
  for (const route of PUBLIC) await expectNoSideScroll(page, route);
});

test("student pages fit every size, with the bottom tab bar on phones", async ({ page }) => {
  test.setTimeout(90_000);
  const student = await createUser("student", "mobile");
  await signIn(page, student.email);
  for (const route of STUDENT) await expectNoSideScroll(page, route);

  // Phones get the bottom tab bar; wide screens get the header nav instead.
  await page.goto("/dashboard");
  await page.setViewportSize(VIEWPORTS.phone);
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main", exact: true })).toBeHidden();
  await page.setViewportSize(VIEWPORTS.desktop);
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Main", exact: true })).toBeVisible();
});

test("staff and admin pages fit every size; tables become cards and dialogs become sheets on phones", async ({ page }) => {
  test.setTimeout(120_000);
  const admin = await createUser("admin", "mobile");
  await signIn(page, admin.email);
  for (const route of STAFF) await expectNoSideScroll(page, route);

  // Listings: a table on wide screens, stacked cards on phones.
  await page.setViewportSize(VIEWPORTS.phone);
  await page.goto("/staff/listings?q=Tulong");
  await waitForHydration(page);
  await expect(page.locator("table")).toBeHidden();
  await expect(page.getByRole("link", { name: "Edit Tulong Dunong Program" })).toBeVisible();
  await page.setViewportSize(VIEWPORTS.laptop);
  await expect(page.locator("table")).toBeVisible();

  // A dialog is a full-width bottom sheet on phones.
  const student = await createUser("student", "mobile-sheet");
  await page.setViewportSize(VIEWPORTS.phone);
  await page.goto(`/admin/users?q=${encodeURIComponent(student.email)}`);
  await waitForHydration(page);
  await page.getByRole("button", { name: `Change role for ${student.email}` }).click();
  const sheet = (await page.getByRole("dialog", { name: "Change role" }).boundingBox())!;
  expect(sheet.width).toBe(VIEWPORTS.phone.width);
  expect(Math.round(sheet.y + sheet.height)).toBe(VIEWPORTS.phone.height);
});
