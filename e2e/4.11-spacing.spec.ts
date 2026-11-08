// 4.11 Comfortable touch targets: on a phone every button, form control and navigation link is at least
// 44px tall (DESIGN.md; 36px is allowed only from 900px, where a mouse is likely).
import { expect, test, type Page } from "@playwright/test";
import { VIEWPORTS } from "../playwright.config";
import { createUser, signIn, waitForHydration } from "./support";

const TARGETS = `button, select, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), nav a, a[class*="min-h"]`;

async function smallTargets(page: Page, route: string) {
  await page.goto(route);
  await waitForHydration(page);
  return page.evaluate((sel) => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === "hidden") continue;
      if (el.closest(".sr-only, [aria-hidden='true']")) continue;
      if (r.height < 43.5) {
        const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30);
        out.push(`${el.tagName.toLowerCase()} "${name}" ${Math.round(r.height)}px`);
      }
    }
    return out;
  }, TARGETS);
}

test.use({ viewport: VIEWPORTS.phone });

test("public and student pages: touch targets are at least 44px on a phone", async ({ page }) => {
  test.setTimeout(60_000);
  for (const route of ["/", "/explore", "/help", "/login"]) expect(await smallTargets(page, route), route).toEqual([]);
  const student = await createUser("student", "targets");
  await signIn(page, student.email);
  for (const route of ["/dashboard", "/applications", "/alerts", "/settings"]) expect(await smallTargets(page, route), route).toEqual([]);
});

test("staff and admin pages: touch targets are at least 44px on a phone", async ({ page }) => {
  test.setTimeout(60_000);
  const admin = await createUser("admin", "targets");
  await signIn(page, admin.email);
  for (const route of ["/staff", "/staff/listings", "/staff/inquiries", "/staff/announcements", "/admin/users", "/admin/audit"]) {
    expect(await smallTargets(page, route), route).toEqual([]);
  }
});
