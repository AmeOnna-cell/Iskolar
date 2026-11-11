// 4.4 Validate every request: server-side validation and rate limits on the inquiry endpoint.
// (Role, status and ?next= checks are in 4.3; RLS is covered by the pgTAP suite. Sign-in limits are per IP,
// and the whole suite signs in from one address, so they're not exercised here.)
import { expect, test } from "@playwright/test";
import { createUser, signIn, waitForHydration } from "./support";

test("questions are validated on the server and limited to 5 an hour per student", async ({ page }) => {
  test.setTimeout(60_000);
  const student = await createUser("student", "ratelimit");
  await signIn(page, student.email);
  await page.goto("/help");
  await waitForHydration(page);

  // Too short: the server says why and nothing is sent.
  await page.getByLabel("Your question", { exact: true }).fill("Hi");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByLabel("Your question", { exact: true })).toHaveAttribute("aria-invalid", "true");

  for (let i = 1; i <= 5; i++) {
    const text = `Rate limit check number ${i}: is the COR enough?`;
    await page.getByLabel("Your question", { exact: true }).fill(text);
    await page.getByRole("button", { name: "Send question" }).click();
    await expect(page.getByText("Question sent.")).toBeVisible();
    await expect(page.getByLabel("Your question", { exact: true })).toBeEmpty();
  }
  await page.getByLabel("Your question", { exact: true }).fill("Rate limit check number 6: one too many?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByText("You've sent 5 questions in the last hour.")).toBeVisible();
});
