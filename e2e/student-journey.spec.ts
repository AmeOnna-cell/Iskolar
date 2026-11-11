// The student journey from the research (register → check eligibility → review details → prepare
// documents → track), plus 4.12: the dashboard is one column in priority order.
import { expect, test } from "@playwright/test";
import { createUser, pickOption, signIn, waitForHydration } from "./support";

test("onboarding → results → checklist → dashboard → tracker", async ({ page }) => {
  const user = await createUser("student", "journey");
  await signIn(page, user.email);
  await expect(page).toHaveURL(/\/dashboard$/);

  // No answers yet: the dashboard's one primary action is the eligibility check.
  await expect(page.getByTestId("dashboard-fact")).toHaveText("Answer a few questions to see which scholarships you qualify for.");
  await page.getByRole("link", { name: "Check my eligibility" }).click();

  // Step 1: validation, then answers (the prototype's sample student "Ana")
  await waitForHydration(page);
  await page.getByRole("radio", { name: "2nd year" }).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Select your course area so we can match course-specific scholarships.")).toBeVisible();
  // A failed step keeps the student's picks, announces the problem and focuses the first one.
  await expect(page.getByRole("radio", { name: "2nd year" })).toBeChecked();
  await expect(page.getByRole("combobox", { name: "Course area" })).toBeFocused();
  await expect(page.locator("main").getByRole("alert")).toHaveText("One answer needs attention.");
  await pickOption(page, "Course area (needed)", "Science & Math");
  await page.getByLabel(/Program/).fill("BS Biology");
  await page.getByRole("radio", { name: "2nd year" }).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 2
  await expect(page).toHaveURL(/step=2/);
  await page.getByLabel("GWA last semester").fill("1.85");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 3: 4Ps left unanswered on purpose
  await expect(page).toHaveURL(/step=3/);
  await page.getByRole("radio", { name: "₱150,000 to ₱250,000" }).check();
  await page.getByRole("group", { name: "Is one of your parents an OFW?" }).getByRole("radio", { name: "Yes" }).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 4
  await expect(page).toHaveURL(/step=4/);
  await pickOption(page, "Home region", "Region III – Central Luzon");
  await page.getByRole("button", { name: "See my results" }).click();

  // Results match the prototype's verdicts for Ana
  await expect(page).toHaveURL(/\/check\/results$/);
  const group = (name: RegExp) => page.getByRole("region", { name });
  await expect(group(/^\d+\s*You qualify$/).getByTestId("scholarship-card")).toHaveCount(4);
  await expect(group(/Might qualify/).getByTestId("scholarship-card")).toHaveCount(1);
  await expect(group(/Might qualify/)).toContainText("Missing answer: household is in 4Ps or the DSWD Listahanan.");
  await expect(page.getByText("This is a preliminary check, not an official decision.")).toBeVisible();

  // Detail: explained eligibility, then tick a document (starts preparing)
  await page.goto("/s/tulong-dunong-program");
  await waitForHydration(page);
  await expect(page.getByText("You meet both requirements we can check")).toBeVisible();
  await expect(page.getByText("Your GWA is 1.85")).toBeVisible();
  await page.getByLabel(/Certificate of Registration/).check();
  await expect(page.getByRole("status").filter({ hasText: "Added to My applications under Preparing" })).toBeVisible();
  await expect(page.getByText("1 of 5 ready")).toBeVisible();
  // While documents are missing, the page leads with what's missing, not "Mark as submitted";
  // the reminder line says what the 07:00 job will actually do.
  await page.reload();
  await expect(page.getByTestId("prep-status")).toHaveText(/^4 documents left · closes in \d+ days?$/);
  await expect(page.getByRole("link", { name: "See what's missing" })).toHaveAttribute("href", "#documents-tulong-dunong-program");
  await expect(page.getByTestId("reminder-copy")).toHaveText(/^It closes in \d+ days?\. You'll get a reminder by email and on-site alerts at 7 AM\.$/);

  // Dashboard: the greeting's fact is the urgent deadline; sections in the brief's order
  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-fact")).toHaveText(/^Tulong Dunong Program closes in \d+ days? and 4 documents are still missing\.$/);
  await expect(page.getByTestId("do-next-list")).toContainText("Tulong Dunong Program");
  const headings = await page.locator("main h1, main h2").allInnerTexts();
  expect(headings.slice(1)).toEqual([
    "Do this next",
    "Recommended for you",
    "My applications",
    "Announcements and alerts",
    expect.stringMatching(/^Eligibility answers: \d+% complete$/),
  ]);

  // Tracker: preparing → submitted
  await page.goto("/applications?tab=preparing");
  await waitForHydration(page);
  // The tracking row shows document progress; the panel beside it holds the checklist and the next move.
  await expect(page.getByRole("meter", { name: "Documents for Tulong Dunong Program" })).toHaveAttribute("aria-valuenow", "1");
  await expect(page.getByRole("region", { name: "Application: Tulong Dunong Program" }).getByText("1 of 5 ready")).toBeVisible();
  // Remove asks first, because it would clear the ticked documents.
  await page.getByRole("button", { name: "Remove for Tulong Dunong Program" }).click();
  await expect(page.getByRole("dialog")).toContainText("The document you ticked will be cleared.");
  await page.getByRole("button", { name: "Keep it" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Mark as submitted for Tulong Dunong Program" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Marked as submitted" })).toBeVisible();
  await page.goto("/applications?tab=submitted");
  await expect(page.getByRole("heading", { name: "Tulong Dunong Program" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approved for Tulong Dunong Program", exact: true })).toBeVisible();

});

test("signed-out visitors can browse but must sign in to track", async ({ page }) => {
  await page.goto("/s/tulong-dunong-program");
  await expect(page.getByRole("heading", { level: 1, name: "Tulong Dunong Program" })).toBeVisible();
  // Requirements are listed for everyone, even without answers.
  await expect(page.getByText("GWA of 3.00 or better")).toBeVisible();
  await expect(page.getByText("Household income of ₱400,000 a year or less")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to track and check eligibility", exact: true })).toHaveAttribute("href", "/login?next=%2Fs%2Ftulong-dunong-program");
  await expect(page.getByLabel(/Certificate of Registration/)).toBeDisabled();
});

test("sample listings are counted separately and never shown as verified", async ({ page }) => {
  await page.goto("/explore");
  const card = page.getByTestId("scholarship-card").filter({ hasText: "Tulong Dunong Program" });
  await expect(card).toBeVisible();
  await expect(card.getByText("Sample listing", { exact: true })).toHaveCount(0);
  await expect(card.getByText(/^(Verified|Unverified)/)).toHaveCount(0);

  await page.goto("/s/tulong-dunong-program");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Tulong Dunong Program (sample listing)");
  await expect(page.getByText(/^Verified /)).toHaveCount(0);
  await expect(page.getByText(/Last checked/)).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByText("sample listings")).toBeVisible();
  await expect(page.getByText("verified with official sources")).toHaveCount(0);
});
