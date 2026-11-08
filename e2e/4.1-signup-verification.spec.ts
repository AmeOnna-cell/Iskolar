// 4.1 Sign-up with email verification (Supabase Auth → SMTP; locally Mailpit).
import { expect, test } from "@playwright/test";
import { PASSWORD, confirmLink, signIn, uniqueEmail, waitForEmail, formAlert, waitForHydration } from "./support";

async function fillSignup(page: import("@playwright/test").Page, email: string, password = PASSWORD) {
  await page.goto("/signup");
  await waitForHydration(page);
  await page.getByLabel("Full name").fill("Ana Reyes");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
}

test("sign up, confirm by email, land on onboarding", async ({ page }) => {
  const email = uniqueEmail("signup");
  const started = Date.now() - 1000;
  await fillSignup(page, email);

  await expect(page).toHaveURL(/\/check-email\?email=/);
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  // The resend button starts on a cooldown.
  await expect(page.getByRole("button", { name: /Send a new link in \d+s/ })).toBeDisabled();
  await expect(page.getByRole("link", { name: /Open Gmail/ })).toHaveAttribute("href", /mail\.google\.com/);

  const mail = await waitForEmail(email, "Confirm your Iskolar account", started);
  expect(mail.html).toContain("Confirm my email");
  const link = confirmLink(mail.html);

  // Cannot sign in before confirming.
  await signIn(page, email);
  await expect(formAlert(page)).toContainText("Confirm your email address first");

  await page.goto(link);
  await expect(page).toHaveURL(/\/check\?welcome=1/);
  await expect(page.getByText("Your email is confirmed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();

  // The same link a second time is "expired or already used", with a way forward.
  await page.context().clearCookies();
  await page.goto(link);
  await expect(page).toHaveURL(/\/auth\/error\?reason=expired&type=email/);
  await expect(page.getByRole("heading", { name: "This link has expired or was already used" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send a new link" })).toBeVisible();
});

test("form validation names the problem and keeps what was typed", async ({ page }) => {
  await fillSignup(page, "not-an-email", "short");
  await expect(page.getByText("Enter an email like name@school.edu.ph.")).toBeVisible();
  await expect(page.getByText(/Your password needs at least 8 characters/)).toBeVisible();
  // Announced, and focus moves to the first field to fix instead of falling back to <body>.
  await expect(formAlert(page)).toHaveText("2 things to fix below.");
  await expect(page.getByLabel("Email")).toBeFocused();
  await expect(page.getByLabel("Full name")).toHaveValue("Ana Reyes");
});

test("a tampered or malformed confirm link shows the error page", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=nope&type=email");
  await expect(page.getByRole("heading", { name: /This link (has expired|doesn't work)/ })).toBeVisible();
  await page.goto("/auth/confirm?type=email");
  await expect(page.getByRole("heading", { name: "This link doesn't work" })).toBeVisible();
});

test("signing up with an existing address looks the same (no account enumeration)", async ({ page }) => {
  const email = uniqueEmail("dupe");
  await fillSignup(page, email);
  await expect(page).toHaveURL(/\/check-email/);
  await page.context().clearCookies();
  await fillSignup(page, email);
  await expect(page).toHaveURL(/\/check-email/);
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
});

test("sign-up shows the privacy note, which links to /privacy, also linked from the footer", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByText("We don't sell your information.", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Read how we handle your data" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "How we handle your data" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
});
