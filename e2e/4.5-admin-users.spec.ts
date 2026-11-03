// 4.5 Admin: deactivate / reactivate / delete users, with guards and auditing.
import { expect, test } from "@playwright/test";
import { createUser, formAlert, signIn, waitForHydration } from "./support";

test("deactivate blocks sign-in, reactivate restores it, both are audited", async ({ page, browser }) => {
  const admin = await createUser("admin", "users-admin");
  const student = await createUser("student", "users-student");

  // The student is signed in on another device.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signIn(otherPage, student.email);
  await expect(otherPage).toHaveURL(/\/dashboard$/);

  await signIn(page, admin.email);
  await page.goto(`/admin/users?q=${encodeURIComponent(student.email)}`);
  await waitForHydration(page);
  await page.getByRole("button", { name: `Deactivate ${student.email}` }).click();
  await expect(page.getByRole("status").filter({ hasText: "1 account deactivated." })).toBeVisible();

  // Signed out everywhere right away, and can't sign back in.
  await otherPage.goto("/dashboard");
  await expect(otherPage).toHaveURL(/\/login/);
  await signIn(otherPage, student.email);
  await expect(formAlert(otherPage)).toContainText("This account has been deactivated");

  await page.reload();
  await waitForHydration(page);
  await page.getByRole("button", { name: `Reactivate ${student.email}` }).click();
  await expect(page.getByRole("status").filter({ hasText: "1 account reactivated." })).toBeVisible();
  await signIn(otherPage, student.email);
  await expect(otherPage).toHaveURL(/\/dashboard$/);
  await other.close();

  // Audit log
  await page.goto(`/admin/audit?actor=${encodeURIComponent(admin.email)}`);
  const audit = page.getByTestId("audit-rows");
  for (const action of ["user.deactivate", "user.ban_and_sign_out", "user.reactivate", "user.unban"]) {
    await expect(audit.getByText(action, { exact: true })).toBeVisible();
  }
});

test("an admin can't act on their own account", async ({ page }) => {
  const admin = await createUser("admin", "self");
  await signIn(page, admin.email);
  await page.goto(`/admin/users?q=${encodeURIComponent(admin.email)}`);
  await expect(page.getByText("This is you")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: `Select ${admin.email}` })).toBeDisabled();
  await expect(page.getByRole("button", { name: `Deactivate ${admin.email}` })).toHaveCount(0);
});

test("delete requires typing the exact email; the account then can't sign in", async ({ page }) => {
  const admin = await createUser("admin", "del-admin");
  const student = await createUser("student", "del-student");
  await signIn(page, admin.email);
  await page.goto(`/admin/users?q=${encodeURIComponent(student.email)}`);
  await waitForHydration(page);
  await page.getByRole("button", { name: `Delete ${student.email}` }).click();

  const dialog = page.getByRole("dialog", { name: "Delete this account?" });
  const confirm = dialog.getByRole("button", { name: "Delete account" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/to confirm/).fill("someone-else@iskolar.test");
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/to confirm/).fill(student.email);
  await confirm.click();
  await expect(page.getByRole("status").filter({ hasText: "Account deleted." })).toBeVisible();

  await page.goto(`/admin/users?status=deleted`);
  await expect(page.getByText("Deleted account").first()).toBeVisible();

  await page.context().clearCookies();
  await signIn(page, student.email);
  await expect(formAlert(page)).toContainText("don't match an account");
});

test("the audit log exports as CSV", async ({ page }) => {
  const admin = await createUser("admin", "csv");
  await signIn(page, admin.email);
  const res = await page.request.get("/admin/audit/export");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  expect((await res.text()).split("\r\n")[0]).toBe('"created_at","actor","actor_role","action","entity_type","entity_id","before","after","ip"');

  // Not for coordinators
  await page.context().clearCookies();
  const coordinator = await createUser("coordinator", "csv-coord");
  await signIn(page, coordinator.email);
  expect((await page.request.get("/admin/audit/export")).status()).toBe(403);
});
