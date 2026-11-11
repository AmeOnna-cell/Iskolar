// 4.12 Dashboard visual hierarchy: content aligned with the top bar, sections in the brief's priority order.
import { expect, test } from "@playwright/test";
import { VIEWPORTS } from "../playwright.config";
import { createUser, signIn } from "./support";

const ORDER = ["Do this next", "Recommended for you", "My applications", "Announcements and alerts"];

test("the dashboard is content aligned with the top bar in priority order", async ({ page }) => {
  const student = await createUser("student", "dash-order");
  await page.setViewportSize(VIEWPORTS.desktop);
  await signIn(page, student.email);
  await expect(page).toHaveURL(/\/dashboard$/);

  const content = await page.locator("main > .page-container").boundingBox();
  const topbar = await page.locator("header .page-container").first().boundingBox();
  expect(content).not.toBeNull();
  expect(topbar).not.toBeNull();
  expect(content!.x).toBe(topbar!.x);
  expect(content!.width).toBe(topbar!.width);

  // Dashboard title first; sections in priority order (some only appear when there's something to show).
  const headings = await page.locator("main h1, main h2").allInnerTexts();
  expect(headings[0]).toBe("Dashboard");
  const present = headings.filter((h) => ORDER.includes(h));
  expect(present).toEqual(ORDER.filter((h) => present.includes(h)));
  expect(present[0]).toBe("Do this next");
});
