// 4.12 Dashboard visual hierarchy: one centred column, sections in the brief's priority order.
import { expect, test } from "@playwright/test";
import { VIEWPORTS } from "../playwright.config";
import { createUser, signIn } from "./support";

const ORDER = ["Do this next", "Recommended for you", "My applications", "Announcements and alerts"];

test("the dashboard is one centred column in priority order", async ({ page }) => {
  const student = await createUser("student", "dash-order");
  await page.setViewportSize(VIEWPORTS.desktop);
  await signIn(page, student.email);
  await expect(page).toHaveURL(/\/dashboard$/);

  // One column, at most ~840px wide and centred, even at 1440.
  const box = (await page.locator("main .reading-column").first().boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(840);
  expect(Math.abs(box.x + box.width / 2 - VIEWPORTS.desktop.width / 2)).toBeLessThan(16);

  // Greeting first; sections in priority order (some only appear when there's something to show).
  const headings = await page.locator("main h1, main h2").allInnerTexts();
  expect(headings[0]).toMatch(/Test$/);
  const present = headings.filter((h) => ORDER.includes(h));
  expect(present).toEqual(ORDER.filter((h) => present.includes(h)));
  expect(present[0]).toBe("Do this next");
});
