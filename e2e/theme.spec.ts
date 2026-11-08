// The inline <head> script applies a stored theme before the app's JavaScript loads (no flash).
import { expect, test } from "@playwright/test";

test("a stored theme applies before the app's JavaScript runs", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("iskolar-theme", "dark"));
  // Block the app bundles: only the inline head script can set the theme.
  await page.route("**/_next/static/chunks/**", (route) => route.abort());
  await page.goto("/help");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
