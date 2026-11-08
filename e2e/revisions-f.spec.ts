// Team-leader revisions, group F: the eligibility check uses one size for every field part (labels,
// options, hints, intro), 14px on phones and 16px above; inputs stay 16px; only the step title is larger.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createUser, signIn, waitForHydration } from "./support";

const px = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((els) => [...new Set(els.map((el) => getComputedStyle(el).fontSize))]);

async function sizes(page: Page, step: number) {
  await page.goto(`/check?step=${step}`);
  await waitForHydration(page);
  const form = "main form";
  return {
    // Labels with text of their own (radio options carry theirs in the inner span).
    field: await px(page, `${form} label[for], ${form} label:has(> input[type=checkbox]), ${form} legend, ${form} fieldset > p, ${form} > div:first-child > p, ${form} label > span`),
    inputs: await px(page, `${form} input:not([type=radio]):not([type=checkbox])`),
    title: await px(page, `${form} h2`),
  };
}

for (const [width, field] of [[360, "14px"], [1280, "16px"]] as const) {
  test(`eligibility check at ${width}px: one field size, 16px inputs, a larger step title`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const student = await createUser("student", `check-type-${width}`);
    await signIn(page, student.email);
    for (const step of [1, 2, 3, 4]) {
      const s = await sizes(page, step);
      expect(s.field, `step ${step} field parts`).toEqual([field]);
      if (s.inputs.length) expect(s.inputs, `step ${step} inputs`).toEqual(["16px"]);
      expect(parseFloat(s.title[0]!), `step ${step} title`).toBeGreaterThan(16);
      // Phones: the page heading is a small label, so the step title is the one larger line.
      if (width === 360) expect(await px(page, "main h1")).toEqual(["14px"]);
    }
    if (width === 360) {
      for (const colorScheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme });
        await page.goto("/check?step=3");
        await waitForHydration(page);
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        expect(r.violations.map((v) => `${colorScheme} ${v.id}`)).toEqual([]);
      }
    }
  });
}
