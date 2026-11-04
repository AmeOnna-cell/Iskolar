// Every E2E run starts with empty rate-limit counters: all test traffic comes from one IP, so
// the sign-up and sign-in limits (which the suite also relies on in production) would trip.
import { adminClient } from "./support";

export default async function globalSetup() {
  const admin = adminClient();
  const { error } = await admin.from("rate_limits").delete().neq("key", "");
  if (error) throw new Error(`Could not reset rate limits: ${error.message}`);
  // Listings created by staff specs (slug prefix "e2e-"): removed so student-side counts stay exact.
  const { error: e2 } = await admin.from("scholarships").delete().like("slug", "e2e-%");
  if (e2) throw new Error(`Could not remove e2e listings: ${e2.message}`);
  // Alerts left undelivered by earlier runs: don't send them now (keeps dispatch quick in 4.7).
  await admin.from("notifications").update({ email_status: "skipped" }).eq("email_status", "pending");
  await admin.from("notifications").update({ push_status: "skipped" }).eq("push_status", "pending");
}
