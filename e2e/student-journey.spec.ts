// The student journey from the research (register → check eligibility → review details → prepare
// documents → track), plus 4.12: the dashboard is one column in priority order.
import { expect, test } from "@playwright/test";
import { createUser, signIn, waitForHydration } from "./support";

test("onboarding → results → checklist → dashboard → tracker", async ({ page }) => {
  const user = await createUser("student", "journey");
  await signIn(page, user.email);
  await expect(page).toHaveURL(/\/dashboard$/);

  // No answers yet: the dashboard's one primary action is the eligibility check.
  await expect(page.getByTestId("dashboard-fact")).toHaveText("Answer a few questions to see which scholarships you qualify for.");
  await page.getByRole("link", { name: "Check my eligibility" }).click();

  // Step 1: validation, then answers (the prototype's sample student "Ana")
  await waitForHydration(page);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Select your course area so we can match course-specific scholarships.")).toBeVisible();
  await page.getByLabel("Course area").selectOption({ label: "Science & Math" });
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
  await page.getByLabel("Home region").selectOption({ label: "Region III – Central Luzon" });
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
  await expect(page.getByText("You meet all 2 requirements we can check")).toBeVisible();
  await expect(page.getByText("Your GWA is 1.85")).toBeVisible();
  await page.getByLabel(/Certificate of Registration/).check();
  await expect(page.getByRole("status").filter({ hasText: "Added to My applications under Preparing" })).toBeVisible();
  await expect(page.getByText("1 of 5 ready")).toBeVisible();

  // Dashboard: the greeting's fact is the urgent deadline; sections in the brief's order
  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-fact")).toHaveText(/^Tulong Dunong Program closes in \d+ days? and 4 documents are still missing\.$/);
  await expect(page.getByTestId("urgent-list")).toContainText("Tulong Dunong Program");
  const headings = await page.locator("main h1, main h2").allInnerTexts();
  expect(headings.slice(1)).toEqual([
    "Closing this week",
    "Next steps",
    "Recommended for you",
    "My applications",
    "Announcements and alerts",
    expect.stringMatching(/^Eligibility answers: \d+% complete$/),
  ]);

  // Tracker: preparing → submitted
  await page.goto("/applications?tab=preparing");
  await waitForHydration(page);
  await page.getByLabel("Status of Tulong Dunong Program").selectOption("submitted");
  await expect(page.getByRole("status").filter({ hasText: "Marked as submitted" })).toBeVisible();
  await page.goto("/applications?tab=submitted");
  await expect(page.getByRole("link", { name: "Tulong Dunong Program" })).toBeVisible();
  await expect(page.getByText("Submitted. Waiting for results.")).toBeVisible();
});

test("signed-out visitors can browse but must sign in to track", async ({ page }) => {
  await page.goto("/s/tulong-dunong-program");
  await expect(page.getByRole("heading", { level: 1, name: "Tulong Dunong Program" })).toBeVisible();
  // Requirements are listed for everyone, even without answers.
  await expect(page.getByText("GWA of 3.00 or better")).toBeVisible();
  await expect(page.getByText("Household income of ₱400,000 a year or less")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to save and track" })).toHaveAttribute("href", "/login?next=/s/tulong-dunong-program");
  await expect(page.getByLabel(/Certificate of Registration/)).toBeDisabled();
});
