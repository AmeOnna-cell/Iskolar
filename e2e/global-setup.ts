// Every E2E run starts with empty rate-limit counters: all test traffic comes from one IP, so
// the sign-up and sign-in limits (which the suite also relies on in production) would trip.
import { adminClient } from "./support";

export default async function globalSetup() {
  const { error } = await adminClient().from("rate_limits").delete().neq("key", "");
  if (error) throw new Error(`Could not reset rate limits: ${error.message}`);
}
