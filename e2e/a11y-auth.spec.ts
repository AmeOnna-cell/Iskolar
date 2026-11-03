// Automated accessibility check (WCAG 2.2 AA rules in axe) on the auth screens, both themes.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { waitForHydration } from "./support";

const ROUTES = ["/login", "/signup", "/forgot-password", "/check-email?email=ana@up.edu.ph", "/auth/error?reason=expired&type=email", "/403"];

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });
    for (const route of ROUTES) {
      test(`no axe violations on ${route}`, async ({ page }) => {
        await page.goto(route);
        await waitForHydration(page);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .exclude("nextjs-portal") // Next.js dev overlay
          .analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      });
    }
  });
}
