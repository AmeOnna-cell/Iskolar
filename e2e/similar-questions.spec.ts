import { expect, test } from "@playwright/test";
import { adminClient, createUser, signIn, waitForHydration } from "./support";

test("coordinator previews a similar-question group and replies only to the selected inquiries", async ({ page }) => {
  test.setTimeout(180_000);
  const admin = adminClient();
  const [coordinator, first, second, third] = await Promise.all([
    createUser("coordinator", "similar-questions"),
    createUser("student", "similar-first"),
    createUser("student", "similar-second"),
    createUser("student", "similar-third"),
  ]);
  let ids: string[] = [];
  let scholarshipId: string | undefined;
  try {
    const stamp = Date.now();
    const { data: provider } = await admin.from("providers").select("id").limit(1).single();
    const { data: scholarship, error: topicError } = await admin.from("scholarships").insert({
      slug: `e2e-similarity-${stamp}`, name: `Similarity test topic ${stamp}`, provider_id: provider!.id,
      amount_text: "Award pending", source_label: "Test listing", listing_status: "published", assigned_coordinator_id: coordinator.id,
    }).select("id").single();
    expect(topicError).toBeNull();
    scholarshipId = scholarship!.id;
    const questions = [
      `What is the TDP application deadline? ${stamp}`,
      `TDP aplicaton deadline when? ${stamp}`,
      `When does the TDP application deadline close? ${stamp}`,
    ];
    const { data, error } = await admin.from("inquiries").insert(
      [first, second, third].map((student, i) => ({ student_id: student.id, scholarship_id: scholarship!.id, question: questions[i] })),
    ).select("id, student_id");
    expect(error).toBeNull();
    ids = data!.map((row) => row.id);
    const anchor = data!.find((row) => row.student_id === first.id)!.id;
    const selected = data!.find((row) => row.student_id === second.id)!.id;
    await signIn(page, coordinator.email, coordinator.password, "/login", 60_000);
    await page.goto(`/staff/inquiries?q=${stamp}`);
    const scholarshipGroup = page.getByRole("link", { name: new RegExp(`Similarity test topic ${stamp}.*3 questions`) });
    await expect(scholarshipGroup).toHaveAttribute("aria-expanded", "false");
    await scholarshipGroup.click();
    await expect(scholarshipGroup).toHaveAttribute("aria-expanded", "true");
    const questionRow = page.getByRole("link", { name: new RegExp(questions[0].split("?")[0]) });
    const expandedRow = page.getByRole("row").filter({ has: questionRow });
    await expect(expandedRow.getByRole("cell", { name: "Today", exact: true })).toBeVisible();
    await expect(expandedRow.getByRole("cell", { name: "Waiting", exact: true })).toBeVisible();
    const received = await expandedRow.getByRole("cell", { name: "Today", exact: true }).boundingBox();
    const status = await expandedRow.getByRole("cell", { name: "Waiting", exact: true }).boundingBox();
    const receivedHeader = await page.getByRole("columnheader", { name: "Received" }).boundingBox();
    const statusHeader = await page.getByRole("columnheader", { name: "Status" }).boundingBox();
    expect(received?.x).toBe(receivedHeader?.x);
    expect(status?.x).toBe(statusHeader?.x);
    await questionRow.click();
    await waitForHydration(page);
    await expect(page).toHaveURL(new RegExp(`/staff/inquiries/${anchor}\\b`), { timeout: 20_000 });
    await expect(page.getByRole("table")).toHaveCount(0);
    const detail = page.getByRole("region", { name: "Question details" });
    const group = detail.locator("summary").filter({ hasText: "Similar questions" });
    await expect(group).toBeVisible({ timeout: 20_000 });
    await expect(detail.getByRole("button", { name: "Batch reply (3)" })).toBeEnabled();
    const preview = detail.getByRole("button", { name: "Reply to this group" });
    await expect(preview).toBeHidden();
    await group.click();
    await expect(detail.getByText(questions[1], { exact: true })).toBeVisible();
    await expect(detail.getByText(questions[2], { exact: true })).toBeVisible();
    await preview.click();
    await detail.getByRole("checkbox", { name: /When does the TDP application deadline close/ }).uncheck();
    const reply = "The application deadline is on the official listing.";
    await detail.getByRole("textbox", { name: "Reply" }).fill(reply);
    await detail.getByRole("button", { name: "Send reply to 2 inquiries" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Reply sent to 2 inquiries." })).toBeVisible({ timeout: 20_000 });
    const { data: replies } = await admin.from("inquiry_replies").select("inquiry_id, body").in("inquiry_id", ids);
    expect(replies).toHaveLength(2);
    expect(replies?.map((item) => item.inquiry_id).sort()).toEqual([anchor, selected].sort());
    expect(replies?.every((item) => item.body === reply)).toBe(true);
    const composer = detail.getByRole("textbox", { name: "Reply", exact: true });
    await expect(composer).toBeVisible();
    await composer.fill("The office can also confirm the deadline.");
    await detail.getByRole("button", { name: "Send reply", exact: true }).click();
    await expect(detail.getByText("The office can also confirm the deadline.", { exact: true })).toBeVisible();
    await detail.getByText("More actions", { exact: true }).click();
    await detail.getByRole("button", { name: "Close question", exact: true }).click();
    await detail.getByRole("button", { name: "Reopen", exact: true }).click();
    const reopen = page.getByRole("dialog", { name: "Reopen this inquiry?" });
    await expect(reopen).toBeVisible();
    await reopen.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(reopen).toBeHidden();
    await detail.getByRole("button", { name: "Reopen", exact: true }).click();
    await reopen.getByRole("button", { name: "Reopen inquiry", exact: true }).click();
    await expect(detail.getByRole("textbox", { name: "Reply", exact: true })).toBeVisible();
    const { data: reopened } = await admin.from("inquiries").select("status").eq("id", anchor).single();
    expect(reopened?.status).toBe("open");
    await page.getByRole("link", { name: "Back to questions" }).click();
    await expect(page.getByRole("link", { name: new RegExp(`Similarity test topic ${stamp}.*2 questions`) })).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("textbox", { name: "Reply", exact: true })).toHaveCount(0);
  } finally {
    if (ids.length) await admin.from("inquiries").delete().in("id", ids);
    if (scholarshipId) await admin.from("scholarships").delete().eq("id", scholarshipId);
    await Promise.all([coordinator, first, second, third].map((user) => admin.auth.admin.deleteUser(user.id)));
  }
});
