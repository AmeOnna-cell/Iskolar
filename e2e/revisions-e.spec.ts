// Team-leader revisions, group E: My applications as a tracking list beside the selected application,
// a details drawer on phones, and announcement alerts that open the Announcements page.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminClient, createUser, signIn, waitForHydration } from "./support";

const TULONG = "tulong-dunong-program";
const CITY = "city-educational-assistance";

async function studentTracking(page: Page, tag: string) {
  const student = await createUser("student", tag);
  const admin = adminClient();
  const { data: s } = await admin.from("scholarships").select("id, slug").in("slug", [TULONG, CITY]);
  const { error } = await admin.from("applications").insert(s!.map((x) => ({ student_id: student.id, scholarship_id: x.id, stage: "preparing" as const })));
  expect(error).toBeNull();
  await signIn(page, student.email);
  return student;
}

async function noAxeViolations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test("wide screens: tracking list with search and progress, the selected application beside it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await studentTracking(page, "track-wide");
  await page.goto("/applications?tab=preparing");
  await waitForHydration(page);

  const list = page.getByTestId("tracking-list");
  await expect(list.getByRole("link")).toHaveCount(2);
  const row = list.getByRole("link", { name: /Tulong Dunong Program/ });
  await expect(row).toContainText("Preparing");
  await expect(row).toContainText(/Deadline \w{3} \d+/);
  await expect(row).toContainText("Not checked"); // no eligibility answers yet

  // Selecting a row changes the panel in place.
  await row.click();
  await expect(page).toHaveURL(/[?&]s=tulong-dunong-program/);
  const panel = page.getByRole("region", { name: "Application: Tulong Dunong Program" });
  for (const text of ["Applications open", "Deadline", "Last updated", "Documents to prepare", "How to apply", "Requirements", "Where to get it"]) {
    await expect(panel.getByText(text).first()).toBeVisible();
  }
  await expect(panel.getByRole("button", { name: "Share" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Mark as submitted for Tulong Dunong Program" })).toBeVisible();
  await expect(panel.getByTestId("docs-left")).toHaveText("5 documents not ticked yet.");

  // Ticking a document here moves the row's Documents bar.
  await panel.getByLabel(/Certificate of Registration/).check();
  await expect(page.getByRole("meter", { name: "Documents for Tulong Dunong Program" })).toHaveAttribute("aria-valuenow", "1");

  // Search looks across every stage (the tabs step aside); a miss offers a way back.
  await page.getByRole("link", { name: /^Saved/ }).click();
  await expect(page).toHaveURL(/tab=saved/);
  const search = page.getByRole("searchbox", { name: "Search your applications" });
  await search.fill("zzz");
  await expect(page.getByText("None of your applications matches “zzz”.")).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await search.fill("city");
  await expect(page.getByText("1 match across all stages")).toBeVisible();
  await expect(list.getByRole("link")).toHaveCount(1);
  await expect(list.getByRole("link")).toContainText("Preparing");

  await noAxeViolations(page);
});

test("phones: the list is the page; a row opens its details in a drawer that Back closes", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await studentTracking(page, "track-phone");
  await page.goto("/applications?tab=preparing");
  await waitForHydration(page);
  await expect(page.getByRole("region", { name: /^Application: / })).toBeHidden();

  await page.getByTestId("tracking-list").getByRole("link", { name: /Tulong Dunong Program/ }).click();
  const dialog = page.getByRole("dialog", { name: "Tulong Dunong Program" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/s=tulong-dunong-program&d=1/);
  await expect(dialog.getByText("Documents to prepare")).toBeVisible();
  await noAxeViolations(page);

  await page.goBack();
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/d=1/);
});

test("announcement alerts open that scholarship's posts, or General announcements", async ({ page }) => {
  const student = await createUser("student", "announce-link");
  const admin = adminClient();
  const { data: s } = await admin.from("scholarships").select("id").eq("slug", CITY).single();
  const stamp = String(Date.now());
  await admin.from("announcements").insert([
    { title: `Link city ${stamp}`, body: "Interviews moved.", scholarship_id: s!.id },
    { title: `Link general ${stamp}`, body: "Offices close Friday." },
  ]);
  const { data: alerts } = await admin.from("notifications").select("id, title").eq("user_id", student.id).eq("kind", "announce").like("title", `Link % ${stamp}`);
  const id = (t: string) => alerts!.find((a) => a.title === `Link ${t} ${stamp}`)!.id;

  await signIn(page, student.email);
  await page.goto(`/alerts/${id("city")}`);
  await expect(page).toHaveURL(new RegExp(`/announcements\\?a=${CITY}`));
  await page.goto(`/alerts/${id("general")}`);
  await expect(page).toHaveURL(/\/announcements\?a=general/);
});
