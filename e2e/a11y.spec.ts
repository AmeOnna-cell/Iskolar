// Automated accessibility checks (axe, WCAG 2.2 AA rules) on every screen built so far, both themes.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createUser, signIn, waitForHydration } from "./support";

const PUBLIC = [
  "/",
  "/explore",
  "/explore?q=zzznothing",
  "/explore?filters=1", // filter drawer open
  "/explore?s=tulong-dunong-program&d=1", // details drawer open
  "/s/tulong-dunong-program",
  "/s/city-educational-assistance",
  "/help",
  "/privacy",
  "/announcements",
  "/announcements?a=general&d=1", // feed drawer open
  "/login",
  "/signup",
  "/forgot-password",
  "/check-email?email=ana@up.edu.ph",
  "/auth/error?reason=expired&type=email",
  "/403",
];
const STAFF = ["/staff", "/staff/listings", "/staff/listings/new", "/staff/inquiries", "/staff/faqs", "/staff/faqs?status=approved", "/staff/faqs/new", "/staff/announcements", "/admin/users", "/admin/audit"];
const STUDENT = ["/dashboard", "/check?step=1", "/check?step=3", "/applications", "/alerts", "/profile", "/help", "/s/tulong-dunong-program"];

async function expectNoViolations(page: Page, route: string) {
  await page.goto(route);
  await waitForHydration(page);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .exclude("nextjs-portal") // Next.js dev overlay
    .analyze();
  expect(results.violations.map((v) => `${route} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });
    for (const route of PUBLIC) {
      test(`no axe violations on ${route}`, async ({ page }) => {
        await expectNoViolations(page, route);
      });
    }
    test("no axe violations on student pages", async ({ page }) => {
      test.setTimeout(90_000);
      const user = await createUser("student", `a11y-${colorScheme}`);
      await signIn(page, user.email);
      await expect(page).toHaveURL(/\/dashboard$/);
      for (const route of STUDENT) await expectNoViolations(page, route);
    });
    test("no axe violations on staff and admin pages", async ({ page }) => {
      test.setTimeout(120_000);
      const user = await createUser("admin", `a11y-admin-${colorScheme}`);
      await signIn(page, user.email);
      for (const route of STAFF) await expectNoViolations(page, route);
      // A listing's edit page, with its status panel and history
      await page.goto("/staff/listings?q=Tulong");
      const edit = await page.getByRole("link", { name: /^Edit/ }).first().getAttribute("href");
      await expectNoViolations(page, edit!);
    });
  });
}
