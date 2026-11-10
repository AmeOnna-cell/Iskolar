// FAQs: suggestions while typing a question, FAQ search with a no-match state, and the staff flow
// (coordinator drafts → admin approves → students see it). Scoring itself is covered by pgTAP 97_faqs.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createUser, signIn, waitForHydration } from "./support";

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test("suggestions appear while a student types a question, and they can still send it", async ({ page }) => {
  const student = await createUser("student", "faq-suggest");
  await signIn(page, student.email);
  await page.goto("/help");
  await waitForHydration(page);

  const ask = page.getByLabel("Your question", { exact: true });
  await ask.pressSequentially("ba"); // under 3 characters: nothing yet
  await page.waitForTimeout(600);
  await expect(page.getByRole("heading", { name: "These answers might help" })).toHaveCount(0);

  await ask.fill("Saan kukuha ng barangay certificate?");
  const suggestions = page.getByRole("region", { name: "These answers might help" });
  await expect(suggestions).toBeVisible();
  const item = suggestions.getByText("Where do I get a Certificate of Indigency?");
  await expect(item).toBeVisible();
  expect(await suggestions.getByRole("listitem").count()).toBeLessThanOrEqual(3);

  // Expands inline with the full answer.
  await item.click();
  await expect(suggestions.getByText(/lines get long near deadlines/)).toBeVisible();
  await expectNoViolations(page);

  // Sending still works, and the form clears.
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Question sent." })).toBeVisible();
  await expect(ask).toHaveValue("");
  await expect(suggestions).toHaveCount(0);
});

test("the FAQ list can be searched, typos included, and no matches offer the ask form", async ({ page }) => {
  // Visitor: results and the signed-out ask link.
  await page.goto("/help#faq-gwa");
  await waitForHydration(page);
  await expect(page.locator("#faq-gwa")).toBeAttached(); // old anchors still exist
  const faqs = page.getByRole("region", { name: "Common questions" });
  const search = page.getByLabel("Search the common questions");
  await search.fill("remnders");
  await expect(page.getByText("1 question matches “remnders”")).toBeVisible();
  await expect(faqs.getByText("How do reminders work?")).toBeVisible();
  await expect(faqs.getByText("What is GWA and where do I find mine?")).toHaveCount(0);
  await faqs.getByRole("button", { name: "Show all questions" }).click();
  await expect(faqs.locator("details")).toHaveCount(7);

  await search.fill("banana smoothie recipe");
  await expect(faqs.getByRole("heading", { name: "No matches for “banana smoothie recipe”" })).toBeVisible();
  await expect(faqs.getByRole("link", { name: "Ask the scholarship office" })).toHaveAttribute("href", "#ask-h");
  await expectNoViolations(page);

  // Student: the button carries the words into the ask form.
  const student = await createUser("student", "faq-search");
  await signIn(page, student.email);
  await page.goto("/help");
  await waitForHydration(page);
  await page.getByLabel("Search the common questions").fill("dormitory curfew rules");
  await page.getByRole("button", { name: "Ask the scholarship office" }).click();
  const ask = page.getByLabel("Your question", { exact: true });
  await expect(ask).toHaveValue("dormitory curfew rules");
  await expect(ask).toBeFocused();
});

test("a coordinator drafts an FAQ, an admin approves it, and students then find it", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const stamp = Date.now();
  const question = `Can I bring a xylophone ${stamp} to the interview?`;
  const coordinator = await createUser("coordinator", "faq-coord");
  const admin = await createUser("admin", "faq-admin");

  // Coordinator: only "Save draft".
  await signIn(page, coordinator.email);
  await page.goto("/staff/faqs/new");
  await waitForHydration(page);
  await expect(page.getByRole("button", { name: "Approve and publish" })).toHaveCount(0);
  await page.getByLabel("Question", { exact: true }).fill(question);
  await page.getByLabel("Answer", { exact: true }).fill("Yes, if it fits in a bag. See [My profile](/profile) for reminders.");
  await page.getByLabel("Keywords").fill(`xylophone${stamp}, instrumento`);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved. An admin approves it before students see it.")).toBeVisible();
  await expect(page.getByRole("link", { name: `Edit ${question}` })).toBeVisible();

  // Students can't find a draft.
  const studentCtx = await browser.newContext();
  const sPage = await studentCtx.newPage();
  const student = await createUser("student", "faq-sees");
  await signIn(sPage, student.email);
  await sPage.goto("/help");
  await waitForHydration(sPage);
  await sPage.getByLabel("Search the common questions").fill(`xylophone${stamp}`);
  await expect(sPage.getByRole("heading", { name: `No matches for “xylophone${stamp}”` })).toBeVisible();

  // Admin reviews and approves.
  const adminCtx = await browser.newContext();
  const aPage = await adminCtx.newPage();
  await signIn(aPage, admin.email);
  await aPage.goto(`/staff/faqs?status=draft&q=${stamp}`);
  await aPage.getByRole("link", { name: `Review ${question}` }).click();
  await expect(aPage.getByLabel("Question", { exact: true })).toHaveValue(question);
  await waitForHydration(aPage);
  await aPage.getByRole("button", { name: "Approve and publish" }).click();
  await expect(aPage.getByText("FAQ approved. Students see it on the Help page and in suggestions.")).toBeVisible();
  await adminCtx.close();

  // Now students find it, by search and as a suggestion; links in the answer work.
  await sPage.reload();
  await waitForHydration(sPage);
  await sPage.getByLabel("Search the common questions").fill(`bring xylophone${stamp} interview`);
  const faqs = sPage.getByRole("region", { name: "Common questions" });
  await expect(faqs.getByText(question)).toBeVisible();
  await faqs.getByText(question).click();
  await expect(faqs.getByRole("link", { name: "My profile" })).toHaveAttribute("href", "/profile");
  await sPage.getByLabel("Your question", { exact: true }).fill(`Is a xylophone${stamp} allowed?`);
  await expect(sPage.getByRole("region", { name: "These answers might help" }).getByText(question)).toBeVisible();
  await studentCtx.close();
});

test("Save as FAQ on an answered question pre-fills a draft", async ({ page, browser }) => {
  const student = await createUser("student", "faq-from-q");
  const coordinator = await createUser("coordinator", "faq-from-q");
  const question = `Do I need a 2x2 photo (${Date.now()})?`;

  await signIn(page, student.email);
  await page.goto("/help");
  await waitForHydration(page);
  await page.getByLabel("Your question", { exact: true }).fill(question);
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Question sent." })).toBeVisible();

  const staff = await browser.newContext();
  const sPage = await staff.newPage();
  await signIn(sPage, coordinator.email);
  await sPage.goto("/staff/inquiries?status=open&size=50");
  await waitForHydration(sPage);
  const item = sPage.locator("li").filter({ hasText: question });
  await expect(item.getByRole("link", { name: /Save as FAQ/ })).toHaveCount(0); // not answered yet
  await item.getByRole("button", { name: "Reply" }).click();
  await item.getByLabel("Reply").fill("Yes, one recent 2x2 photo with a white background.");
  await item.getByRole("button", { name: "Send reply" }).click();
  await expect(sPage.getByRole("status").filter({ hasText: "Reply sent." })).toBeVisible();

  await sPage.goto("/staff/inquiries?status=answered&size=50");
  await sPage.locator("li").filter({ hasText: question }).getByRole("link", { name: /Save as FAQ/ }).click();
  await expect(sPage.getByRole("heading", { name: "Add an FAQ" })).toBeVisible();
  await expect(sPage.getByLabel("Question", { exact: true })).toHaveValue(question);
  await expect(sPage.getByLabel("Answer", { exact: true })).toHaveValue("Yes, one recent 2x2 photo with a white background.");
  await staff.close();
});
