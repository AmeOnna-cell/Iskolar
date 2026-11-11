import { test, expect } from "@playwright/test";
import { adminClient, createUser, signIn, waitForHydration } from "./support";

test("inquiry history pages over 100 questions, supports follow-ups, and announcements prioritize tracked scholarships", async ({ page }) => {
  test.setTimeout(120_000);
  const admin = adminClient();
  const user = await createUser("student", "inquiry-history");
  let ids: string[] = [];
  let announcementIds: string[] = [];
  try {
    const { data: listing, error: listingError } = await admin.from("scholarships").select("id, slug, name").eq("listing_status", "published").order("name").limit(1).single();
    expect(listingError).toBeNull();
    const { data, error } = await admin.from("inquiries").insert(
      [
        ...Array.from({ length: 101 }, (_, i) => ({ student_id: user.id, question: `Paging regression question ${i}`, created_at: "2026-10-01T00:00:00Z" })),
        { student_id: user.id, scholarship_id: listing!.id, question: "First question about this scholarship", created_at: "2026-10-02T00:00:00Z" },
        { student_id: user.id, scholarship_id: listing!.id, question: "Second question about this scholarship", created_at: "2026-10-03T00:00:00Z" },
      ],
    ).select("id");
    expect(error).toBeNull();
    ids = data!.map((row) => row.id);
    await admin.from("applications").insert({ student_id: user.id, scholarship_id: listing!.id, stage: "saved" });
    const announcements = await admin.from("announcements").insert([
      { scholarship_id: listing!.id, title: "First unread test announcement", body: "Test update one" },
      { scholarship_id: listing!.id, title: "Second unread test announcement", body: "Test update two" },
    ]).select("id");
    expect(announcements.error).toBeNull();
    announcementIds = announcements.data!.map((row) => row.id);
    const { count: unreadCount } = await admin.from("announcements").select("id", { count: "exact", head: true }).eq("scholarship_id", listing!.id);
    await signIn(page, user.email);
    await page.goto("/help/questions");
    await expect(page.getByTestId("range")).toHaveText("1–10 of 102");
    await expect(page.locator("tbody tr")).toHaveCount(10);
    await expect(page.getByRole("columnheader")).toHaveText(["Date", "Scholarship", "Status"]);
    await expect(page.getByRole("navigation", { name: "Help sections" }).getByRole("link", { name: "Questions" })).toHaveAttribute("aria-current", "page");
    const scholarshipThread = page.getByRole("link", { name: listing!.name, exact: true });
    await expect(scholarshipThread).toHaveCount(1);
    await scholarshipThread.click();
    await expect(page.getByText("First question about this scholarship", { exact: true })).toBeVisible();
    await expect(page.getByText("Second question about this scholarship", { exact: true })).toBeVisible();
    await waitForHydration(page);
    const composer = page.getByRole("textbox", { name: "Send a message" });
    await composer.fill("indigensy certificate");
    await expect(page.getByRole("region", { name: "These answers might help" })).toContainText(/indigency/i, { timeout: 15_000 });
    await composer.fill("How much is the scholarship amount?");
    await expect(page.getByRole("region", { name: "Answers from scholarship details" })).toContainText("What is the scholarship amount?", { timeout: 15_000 });
    await page.getByRole("link", { name: "Back to questions" }).click();
    await expect(page.getByTestId("range")).toHaveText("1–10 of 102", { timeout: 15_000 });
    await page.getByRole("link", { name: "Next", exact: true }).click();
    await expect(page.getByTestId("range")).toHaveText("11–20 of 102", { timeout: 15_000 });
    await page.locator("tbody a").first().click();
    await waitForHydration(page);
    await page.getByRole("textbox", { name: "Send a message" }).fill("Please confirm my deadline.");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("Please confirm my deadline.", { exact: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Send a message" })).toBeEmpty();
    await page.getByRole("link", { name: "Back to questions" }).click();
    await expect(page.getByTestId("range")).toHaveText("11–20 of 102", { timeout: 15_000 });
    await page.goto(`/help?about=${listing!.id}`);
    await waitForHydration(page);
    await expect(page.getByRole("heading", { name: "Help and FAQ", exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "Your question" }).fill("How much is the amount?");
    await expect(page.getByRole("heading", { name: "From the scholarship details" })).toBeVisible({ timeout: 15_000 });
    await page.goto("/announcements");
    await waitForHydration(page);
    const board = page.getByRole("region", { name: "Scholarships", exact: true });
    await expect(board.locator("li").first()).toContainText("General announcements");
    await expect(board.locator("li").nth(1)).toContainText(listing!.name);
    await expect(board.locator("li").nth(1)).toContainText("Tracked scholarship");
    await expect(board.getByRole("link")).toHaveCount((await admin.from("scholarships").select("id", { count: "exact", head: true }).eq("listing_status", "published")).count! + 1);
    const tracked = board.locator("li").nth(1);
    await expect(tracked).toContainText(`${unreadCount} new announcements`);
    await tracked.getByRole("link").click();
    await expect(page.getByRole("heading", { name: "First unread test announcement" })).toBeVisible();
    await expect(tracked).not.toContainText(/new announcements?/, { timeout: 20_000 });
    await page.reload();
    await expect(tracked).not.toContainText(/new announcements?/, { timeout: 20_000 });
    await page.getByRole("searchbox", { name: "Search messages in this scholarship" }).fill("no-matching-message-987");
    await expect(page.getByRole("status").filter({ hasText: "0 messages found" })).toBeVisible();
  } finally {
    if (announcementIds.length) await admin.from("announcements").delete().in("id", announcementIds);
    if (ids.length) await admin.from("inquiries").delete().in("id", ids);
    await admin.auth.admin.deleteUser(user.id);
  }
});
