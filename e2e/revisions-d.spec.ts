// Team-leader revisions, group D: the public Announcements page, its place in the navigation, and the
// links to it from scholarship details and the dashboard.
import { expect, test } from "@playwright/test";
import { adminClient, createUser, pickOption, signIn, waitForHydration } from "./support";

const SLUG = "city-educational-assistance";
let stamp = "";

test.beforeAll(async () => {
  stamp = String(Date.now());
  const admin = adminClient();
  const { data: s } = await admin.from("scholarships").select("id").eq("slug", SLUG).single();
  const { error } = await admin.from("announcements").insert([
    { title: `Board general ${stamp}`, body: "Offices close on Friday for the holiday.\nForms resume Monday.", posted_as: "Scholarship office" },
    { title: `Board city ${stamp}`, body: "Interviews are at the city hall annex.", posted_as: "City Scholarship Office", scholarship_id: s!.id },
  ]);
  expect(error).toBeNull();
});

test("Announcements is in the main navigation; the phone tab bar stays at five with Help in the header", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main", exact: true }).getByRole("link", { name: "Announcements" })).toBeVisible();
  await page.setViewportSize({ width: 360, height: 740 });
  const tabs = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link");
  await expect(tabs).toHaveCount(5);
  await expect(tabs.filter({ hasText: "News" })).toHaveAttribute("href", "/announcements");
  await expect(page.getByRole("link", { name: "Help", exact: true })).toBeVisible();
});

test("wide screens: General first, search, and a scholarship's posts with its dates beside the list", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/announcements");
  await waitForHydration(page);
  const list = page.getByRole("region", { name: "Scholarships with announcements" });
  await expect(list.getByRole("link").first()).toContainText("General announcements");
  const feed = page.getByRole("region", { name: /^Announcements: / });
  await expect(feed.getByRole("heading", { level: 2 })).toHaveText("General announcements");
  await expect(feed.getByText(`Board general ${stamp}`)).toBeVisible();

  await page.getByRole("searchbox", { name: "Search announcements by scholarship" }).fill("city educ");
  await expect(list.getByRole("link")).toHaveCount(1);
  await list.getByRole("link", { name: /City Educational Assistance/ }).click();
  await expect(page).toHaveURL(new RegExp(`/announcements\\?a=${SLUG}$`));
  await expect(feed.getByRole("heading", { level: 2 })).toHaveText("City Educational Assistance");
  await expect(feed.getByText("Applications open")).toBeVisible();
  await expect(feed.getByText("Deadline")).toBeVisible();
  await expect(feed.getByText(`Board city ${stamp}`)).toBeVisible();
  await expect(feed.getByRole("link", { name: "View the scholarship" })).toHaveAttribute("href", `/s/${SLUG}`);

  await page.getByRole("searchbox", { name: "Search announcements by scholarship" }).fill("zzz");
  await expect(page.getByText("No scholarship with announcements matches “zzz”.")).toBeVisible();
});

test("phones: the list is the page; an entry opens in a drawer that Back closes", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/announcements");
  await waitForHydration(page);
  await expect(page.getByRole("region", { name: /^Announcements: / })).toBeHidden();
  const entry = page.getByRole("link", { name: /City Educational Assistance/ });
  await entry.click();
  const drawer = page.getByRole("dialog", { name: "Announcements: City Educational Assistance" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText(`Board city ${stamp}`)).toBeVisible();
  await page.goBack();
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(/\/announcements(\?a=city-educational-assistance)?$/);
  await expect(entry).toBeFocused();
});

test("posting about a scholarship links its details to the board (the details cache is refreshed)", async ({ page }) => {
  const title = `Board post ${Date.now()}`;
  const coordinator = await createUser("coordinator", "board");
  await signIn(page, coordinator.email);
  await page.goto("/staff/announcements");
  await waitForHydration(page);
  await page.getByLabel("Title").first().fill(title);
  await page.getByLabel("Message").first().fill("Bring your COR to the interview.");
  await pickOption(page, "About a scholarship (optional)", "City Educational Assistance");
  await page.getByRole("button", { name: "Post announcement" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Announcement posted." })).toBeVisible();

  await page.goto(`/s/${SLUG}`);
  await page.getByRole("link", { name: /announcements? from the scholarship office/ }).click();
  await expect(page).toHaveURL(new RegExp(`/announcements\\?a=${SLUG}$`));
  await expect(page.getByText(title)).toBeVisible();
});

test("arriving with ?a= on a phone opens that entry; Back returns to the list", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto(`/announcements?a=${SLUG}`);
  const drawer = page.getByRole("dialog", { name: "Announcements: City Educational Assistance" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByTestId("time-left")).toHaveText(/days? left|Closes today|Closed|Opens in/);
  await page.goBack();
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/announcements\\?a=${SLUG}$`));
  await expect(page.getByRole("link", { name: /City Educational Assistance/ })).toHaveAttribute("aria-current", "true");
});

test("from 1000px (lg) both boards use the side panel, never the drawer", async ({ page }) => {
  await page.setViewportSize({ width: 1010, height: 800 });
  await page.goto("/announcements");
  await waitForHydration(page);
  await page.getByRole("link", { name: /City Educational Assistance/ }).click();
  await expect(page).toHaveURL(new RegExp(`/announcements\\?a=${SLUG}$`));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Announcements: City Educational Assistance" })).toBeVisible();

  await page.goto("/explore");
  await waitForHydration(page);
  await page.getByRole("link", { name: "Tulong Dunong Program", exact: true }).click();
  await expect(page).toHaveURL(/s=tulong-dunong-program$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Selected scholarship" })).toContainText("Tulong Dunong Program");
});

test("an unknown or non-public entry says so and shows the general announcements", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/announcements?a=no-such-scholarship");
  await expect(page.getByText("That scholarship has no public announcements right now.")).toBeVisible();
  await expect(page.getByRole("region", { name: /^Announcements: / }).getByRole("heading", { level: 2 })).toHaveText("General announcements");
});
