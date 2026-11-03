// Creates the first admin, or promotes an existing account to admin.
// Usage: npm run seed:admin -- admin@example.com ["Full Name"]
// Uses SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL from .env.local (server-only secrets).
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const [email, fullName] = process.argv.slice(2);
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run seed:admin -- admin@example.com ["Full Name"]');
  process.exit(2);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(2);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const normalized = email.trim().toLowerCase();

const { data: existing, error: findError } = await admin
  .from("profiles")
  .select("id, role, status")
  .eq("email", normalized)
  .maybeSingle();
if (findError) throw findError;

let userId = existing?.id;
let password: string | null = null;

if (!userId) {
  // A strong one-time password, shown once. Change it after the first sign-in (Settings → Change password).
  password = randomBytes(12).toString("base64url") + "aA1";
  const { data, error } = await admin.auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : {},
  });
  if (error) throw error;
  userId = data.user.id;
} else if (existing?.status !== "active") {
  console.error(`${normalized} is ${existing?.status}. Reactivate it before making it an admin.`);
  process.exit(1);
}

const { error: roleError } = await admin.from("profiles").update({ role: "admin" }).eq("id", userId!);
if (roleError) throw roleError;
await admin.rpc("log_audit", {
  p_action: "user.seed_admin",
  p_entity_type: "user",
  p_entity_id: userId!,
  p_after: { role: "admin" },
});

console.log(`${normalized} is now an admin.`);
if (password) {
  console.log(`Temporary password (shown once): ${password}`);
  console.log("Sign in, then change it in Settings → Change password.");
}
