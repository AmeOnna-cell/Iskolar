// 4.3 / 4.4 Three roles: route groups, 403 for the wrong role, ?next= kept same-origin,
// deactivated accounts rejected even with a valid session.
import { expect, test } from "@playwright/test";
import { createUser, setStatus, signIn, formAlert } from "./support";

test("signed out: protected pages go to login and come back after signing in", async ({ page }) => {
  const user = await createUser("student", "next");
  await page.goto("/applications?tab=preparing");
  await expect(page).toHaveURL(/\/login\?next=%2Fapplications%3Ftab%3Dpreparing/);
  await expect(page.getByText("Sign in to continue.")).toBeVisible();
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/applications\?tab=preparing$/);
});

test("?next= never leaves the site", async ({ page }) => {
  const user = await createUser("student", "evil-next");
  await signIn(page, user.email, user.password, "/login?next=https://evil.example.com/steal");
  await expect(page).toHaveURL(/localhost:\d+\/dashboard$/);
  await page.context().clearCookies();
  await signIn(page, user.email, user.password, "/login?next=//evil.example.com");
  await expect(page).toHaveURL(/localhost:\d+\/dashboard$/);
});

test("each role reaches its own area and gets a real 403 elsewhere", async ({ page }) => {
  const student = await createUser("student");
  const coordinator = await createUser("coordinator");
  const admin = await createUser("admin");

  await signIn(page, student.email);
  await expect(page).toHaveURL(/\/dashboard$/);
  for (const path of ["/staff", "/admin/users"]) {
    const res = await page.goto(path);
    expect(res?.status(), `student → ${path}`).toBe(403);
    await expect(page.getByRole("heading", { name: "You don't have access to this page" })).toBeVisible();
  }
  // Signed-in users skip the sign-in pages.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.context().clearCookies();
  await signIn(page, coordinator.email);
  await expect(page).toHaveURL(/\/staff$/);
  expect((await page.goto("/admin/users"))?.status()).toBe(403);
  expect((await page.goto("/dashboard"))?.status()).toBe(403);

  await page.context().clearCookies();
  await signIn(page, admin.email);
  await expect(page).toHaveURL(/\/staff$/);
  expect((await page.goto("/admin/users"))?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
});

test("a deactivated account cannot sign in, and an open session is ended", async ({ page }) => {
  const user = await createUser("student", "deact");
  await signIn(page, user.email);
  await expect(page).toHaveURL(/\/dashboard$/);

  await setStatus(user.id, "deactivated");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?error=deactivated/);
  await expect(page.getByText("This account has been deactivated")).toBeVisible();

  await signIn(page, user.email);
  await expect(formAlert(page)).toContainText("This account has been deactivated");
  await setStatus(user.id, "active");
});
