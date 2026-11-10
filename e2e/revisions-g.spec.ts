// Team-leader revisions, group G (2026-11-11):
// 1. "Where to submit" on scholarship details (panel, drawer, full page) and in My applications.
// 2. Visitors don't see Eligibility check, My applications or Announcements; those need sign-in.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminClient, createUser, signIn, waitForHydration } from "./support";

const CITY = "city-educational-assistance";

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}
const submitBlock = (page: Page) => page.getByRole("region", { name: "Where to submit" });

// ---------- 2. Visitors ----------

test("signed out: the nav, tab bar and footer show only public pages", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const main = page.getByRole("navigation", { name: "Main", exact: true });
  await expect(main.getByRole("link")).toHaveText(["Home", "Find scholarships"]);
  const footer = page.getByRole("navigation", { name: "Footer" });
  await expect(footer.getByRole("link", { name: "Find scholarships" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Eligibility check" })).toHaveCount(0);

  await page.setViewportSize({ width: 360, height: 740 });
  const tabs = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link");
  await expect(tabs).toHaveText(["Home", "Search", "Sign in"]);
  await expect(tabs.filter({ hasText: "Sign in" })).toHaveAttribute("href", "/login");

  // No plain links to the three pages on the public screens (sign-in links with ?next= are fine).
  for (const route of ["/", "/explore", `/s/${CITY}`]) {
    await page.goto(route);
    await expect(page.locator('a[href="/check"], a[href^="/check?"], a[href^="/applications"], a[href^="/announcements"]'), route).toHaveCount(0);
  }
});

test("signed out: scholarship details offer an account instead of the announcements link", async ({ page }) => {
  // A listing no earlier spec opens, so its cached details include this direct insert.
  const slug = "provincial-allied-health-grant";
  const admin = adminClient();
  const { data: s } = await admin.from("scholarships").select("id").eq("slug", slug).single();
  await admin.from("announcements").insert({ title: `Visitor prompt ${Date.now()}`, body: "Bring your COR.", posted_as: "Provincial Scholarship Office", scholarship_id: s!.id });
  await page.goto(`/s/${slug}`);
  await expect(page.getByText(/announcements? from the scholarship office\./)).toBeVisible();
  await expect(page.getByRole("link", { name: "Create an account to read them" })).toHaveAttribute("href", "/signup");
});

for (const path of ["/check", "/applications?tab=preparing", "/announcements?a=general"]) {
  test(`signed out: ${path} goes to sign-in and comes back after`, async ({ page }) => {
    const student = await createUser("student", "gate");
    await page.goto(path);
    await expect(page).toHaveURL((u) => u.pathname === "/login" && u.searchParams.get("next") === path);
    await waitForHydration(page);
    await page.getByLabel("Email").fill(student.email);
    await page.getByLabel("Password", { exact: true }).fill(student.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL((u) => u.pathname + u.search === path);
  });
}

// ---------- 1. Where to submit ----------

test("details show where to submit: full page, side panel and phone drawer", async ({ page }) => {
  await page.goto(`/s/${CITY}`);
  const block = submitBlock(page);
  await expect(block.getByText("In person")).toBeVisible();
  await expect(block.getByText("City Scholarship Office (sample)")).toBeVisible();
  await expect(block.getByText("Monday to Friday, 8:00 AM to 5:00 PM")).toBeVisible();
  await expect(block.getByText("Bring the originals and one photocopy of each document.")).toBeVisible();
  await expectNoViolations(page);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/explore?s=dost-sei-junior-level-science");
  const panel = page.getByRole("complementary", { name: "Selected scholarship" });
  const where = panel.getByRole("region", { name: "Where to submit" });
  await expect(where.getByText("Submit online at")).toBeVisible();
  await expect(where.getByRole("link", { name: /sei\.dost\.gov\.ph/ })).toHaveAttribute("href", "https://www.sei.dost.gov.ph");

  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/explore?s=tulong-dunong-program&d=1");
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("region", { name: "Where to submit" }).getByText("Through your school")).toBeVisible();
});

test("a listing with nothing set says to confirm with the provider", async ({ page }) => {
  const admin = adminClient();
  const { data: p } = await admin.from("providers").select("id").eq("abbr", "CHED").single();
  const slug = `e2e-nosubmit-${Date.now()}`;
  const { error } = await admin.from("scholarships").insert({
    slug, provider_id: p!.id, name: `No submit info ${slug}`, amount_text: "₱1,000", source_label: "E2E", listing_status: "published",
  });
  expect(error).toBeNull();
  await page.goto(`/s/${slug}`);
  await expect(submitBlock(page)).toContainText("Confirm with the provider where to submit.");
  await expect(submitBlock(page).getByTestId("where-to-submit")).toHaveCount(0);
});

test("My applications shows where to submit next to the checklist", async ({ page }) => {
  const student = await createUser("student", "submit-apps");
  const admin = adminClient();
  const { data: s } = await admin.from("scholarships").select("id").eq("slug", "tulong-dunong-program").single();
  await admin.from("applications").insert({ student_id: student.id, scholarship_id: s!.id, stage: "preparing" });
  await signIn(page, student.email);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/applications?tab=preparing&s=tulong-dunong-program");
  const panel = page.getByTestId("panel-header").locator("..");
  const sections = panel.getByRole("heading", { level: 3 });
  await expect(sections).toContainText(["Documents to prepare", "Where to submit", "How to apply"]);
  await expect(panel.getByRole("region", { name: "Where to submit" })).toContainText("Your school's scholarship coordinator");
});

test("the listing editor needs a link when students submit online", async ({ page }) => {
  const admin = await createUser("admin", "submit-edit");
  await signIn(page, admin.email);
  await page.goto("/staff/listings?q=Tulong");
  await waitForHydration(page);
  await page.locator("table").getByRole("link", { name: "Edit Tulong Dunong Program" }).click();
  const section = page.getByRole("region", { name: "Where to submit" });
  await expect(section.getByLabel("Office or place")).toHaveValue("Your school's scholarship coordinator");
  await section.getByLabel("How students submit").selectOption("online");
  await section.getByLabel("Online link").fill("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Online link: add where students submit online.")).toBeVisible();
  await expect(section.getByLabel("Online link")).toBeFocused();
});
