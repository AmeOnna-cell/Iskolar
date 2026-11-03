// 4.2 Reset password: same message for any email, reset link, new password, other sessions end.
import { expect, test } from "@playwright/test";
import { PASSWORD, confirmLink, createUser, signIn, uniqueEmail, waitForEmail, formAlert, formStatus } from "./support";

const NEW_PASSWORD = "Fresh2026Pass";

test("the reset form gives the same answer whether or not the account exists", async ({ page }) => {
  const user = await createUser("student", "reset-same");
  const messages: string[] = [];
  for (const email of [user.email, uniqueEmail("nobody")]) {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    const status = formStatus(page);
    await expect(status).toContainText("If there's an Iskolar account for");
    messages.push((await status.innerText()).replace(email, "<email>"));
  }
  expect(messages[0]).toBe(messages[1]);
});

test("reset link → new password → signed in; old password and other sessions stop working", async ({ page, browser }) => {
  const user = await createUser("student", "reset-flow");

  // Another device is signed in before the reset.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signIn(otherPage, user.email);
  await expect(otherPage).toHaveURL(/\/dashboard/);

  const started = Date.now() - 1000;
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(user.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(formStatus(page)).toBeVisible();

  const mail = await waitForEmail(user.email, "Reset your Iskolar password", started);
  await page.goto(confirmLink(mail.html));
  await expect(page).toHaveURL(/\/auth\/update-password/);

  await page.getByLabel("New password", { exact: true }).fill("weak");
  await page.getByLabel("Type the new password again").fill("weak");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText(/Your password needs/)).toBeVisible();

  await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Type the new password again").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/\/dashboard\?password=updated/);
  await expect(page.getByText("Your password is updated")).toBeVisible();

  // The other device's session was revoked.
  await otherPage.goto("/dashboard");
  await expect(otherPage).toHaveURL(/\/login/);
  await other.close();

  // Old password no longer works; the new one does.
  await page.context().clearCookies();
  await signIn(page, user.email, PASSWORD);
  await expect(formAlert(page)).toContainText("don't match an account");
  await signIn(page, user.email, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard/);
});
