// 4.8 Don't allow going back after sign-out.
import { expect, test } from "@playwright/test";
import { createUser, signIn } from "./support";

test("sign in → dashboard → sign out → Back shows the login page and no private data", async ({ page }) => {
  const user = await createUser("student", "back");
  await signIn(page, user.email);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("private-email")).toContainText(user.email);

  // Authenticated pages are never cached.
  const res = await page.request.get("/dashboard");
  expect(res.headers()["cache-control"]).toContain("no-store");

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login\?signedOut=1/);
  await expect(page.getByText("You're signed out.")).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(user.email);

  // Forward and a direct visit don't bring it back either.
  await page.goForward();
  await expect(page.locator("body")).not.toContainText(user.email);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});
