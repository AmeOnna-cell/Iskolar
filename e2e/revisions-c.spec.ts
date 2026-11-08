// Team-leader revisions, group C: the bell dropdown, the account menu, and My profile (name, password,
// reminders, self-delete). The database rules for self-delete are in supabase/tests/95_self_delete.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminClient, createUser, PASSWORD, signIn, waitForHydration } from "./support";

async function expectAxeClean(page: Page, what: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).exclude("nextjs-portal").analyze();
  expect(r.violations.map((v) => `${what} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

async function seedAlerts(userId: string, n: number) {
  const now = Date.now();
  const rows = Array.from({ length: n }, (_, i) => ({
    user_id: userId,
    kind: "new" as const,
    title: `Bell check ${i + 1}`,
    body: "A scholarship that matches your profile.",
    link: "/explore",
    dedupe_key: `bell-check:${userId}:${i}`,
    created_at: new Date(now - (n - i) * 60_000).toISOString(),
    read_at: i < 2 ? new Date(now).toISOString() : null, // the two oldest are already read
  }));
  const { error } = await adminClient().from("notifications").insert(rows);
  expect(error).toBeNull();
}

test("the bell opens the 10 latest alerts; mark all as read; see all", async ({ page }) => {
  const student = await createUser("student", "bell");
  await seedAlerts(student.id, 12);
  await signIn(page, student.email);
  await waitForHydration(page);
  const bell = page.getByRole("button", { name: "Alerts, 10 unread" });
  await bell.click();

  const panel = page.getByRole("menu", { name: /^Alerts/ });
  const items = panel.getByRole("menuitem").filter({ hasText: /^Bell check/ });
  await expect(items).toHaveCount(10);
  await expect(items.first()).toContainText("Bell check 12"); // newest first
  await expect(items.first()).toContainText("unread");
  await expect(items.first()).toHaveAttribute("href", /^\/alerts\/[0-9a-f-]{36}$/);
  await expectAxeClean(page, "bell menu open");

  await panel.getByRole("menuitem", { name: "Mark all as read" }).click();
  await expect(page.getByTestId("unread-badge")).toHaveCount(0);
  await expect(page.locator('button[title="Alerts"]')).toHaveAttribute("aria-label", "Alerts"); // hidden from the a11y tree while the menu is open
  await expect(items.first()).not.toContainText("unread");

  await panel.getByRole("menuitem", { name: "See all notifications" }).click();
  await expect(page).toHaveURL(/\/alerts$/);
});

test("on phones the alerts panel is full width", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const student = await createUser("student", "bell-phone");
  await seedAlerts(student.id, 3);
  await signIn(page, student.email);
  await waitForHydration(page);
  await page.getByRole("button", { name: /^Alerts/ }).click();
  const box = (await page.getByRole("menu", { name: /^Alerts/ }).boundingBox())!;
  expect([Math.round(box.x), Math.round(box.width)]).toEqual([0, 360]);
});

test("account menu order; Settings moved to My profile, old links still work", async ({ page }) => {
  const student = await createUser("student", "menu");
  await signIn(page, student.email);
  await waitForHydration(page);
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menuitem")).toHaveText(["My profile", "Edit eligibility answers", "Help and FAQ", "Sign out"]);
  await page.keyboard.press("Escape");

  await page.goto("/settings");
  await expect(page).toHaveURL(/\/profile$/);
  await page.goto("/settings/notifications"); // the link in every email
  await expect(page).toHaveURL(/\/profile#reminders$/);
  await expect(page.getByRole("heading", { name: "Reminders" })).toBeVisible();
});

test("My profile: change name, change password with the current one", async ({ page }) => {
  const student = await createUser("student", "profile");
  await signIn(page, student.email);
  await page.goto("/profile");
  await waitForHydration(page);

  await page.getByLabel("Full name").fill("Ana Marie Reyes");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Name saved.")).toBeVisible();
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menu")).toContainText("Ana Marie Reyes");
  await page.keyboard.press("Escape");

  const next = "New-password-2B";
  await page.getByLabel("Current password").fill("not-my-password");
  await page.getByLabel("New password").fill(next);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByLabel("Current password")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("That isn't your current password.")).toBeVisible();

  await page.getByLabel("Current password").fill(PASSWORD);
  await page.getByLabel("New password").fill(next);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Password changed. Your other devices were signed out.")).toBeVisible();

  // The new password works.
  await page.context().clearCookies();
  await signIn(page, student.email, next);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("delete my account: email and current password, then goodbye; the account is gone", async ({ page }) => {
  const student = await createUser("student", "selfdelete");
  await signIn(page, student.email);
  await page.goto("/profile#delete");
  await waitForHydration(page);
  await page.getByRole("button", { name: "Delete my account" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete your account?" });
  const confirm = dialog.getByRole("button", { name: "Delete my account" });
  await expectAxeClean(page, "delete dialog open");

  // A wrong email is refused; closing and reopening starts clean, and focus goes back to the button.
  await dialog.getByLabel("Type your email to confirm").fill("someone.else@example.com");
  await dialog.getByLabel("Current password").fill(PASSWORD);
  await confirm.click();
  await expect(dialog.getByText("The email you typed doesn't match your account")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Delete my account" })).toBeFocused();
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(dialog.getByText("The email you typed doesn't match your account")).toBeHidden();
  await expect(dialog.getByLabel("Type your email to confirm")).toHaveValue("");

  await dialog.getByLabel("Type your email to confirm").fill(student.email.toUpperCase());
  await dialog.getByLabel("Current password").fill("wrong-password-1A");
  await confirm.click();
  await expect(dialog.getByText("That isn't your current password.")).toBeVisible();
  const { data: still } = await adminClient().from("profiles").select("status").eq("id", student.id).single();
  expect(still!.status).toBe("active");

  await dialog.getByLabel("Current password").fill(PASSWORD);
  await confirm.click();
  await expect(page).toHaveURL(/\/goodbye$/);
  await expect(page.getByRole("heading", { name: "Your account is deleted" })).toBeVisible();

  const { data: gone } = await adminClient().from("profiles").select("status, email, full_name").eq("id", student.id).single();
  expect(gone).toEqual({ status: "deleted", email: null, full_name: null });
  const { data: audit } = await adminClient().from("audit_logs").select("action").eq("entity_id", student.id).order("id");
  expect(audit!.map((a) => a.action)).toEqual(expect.arrayContaining(["user.self_delete", "user.delete", "user.auth_deleted"]));

  // Signed out here, and the sign-in account no longer exists.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/login");
  await waitForHydration(page);
  await page.getByLabel("Email").fill(student.email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
