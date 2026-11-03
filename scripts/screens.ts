// Screenshot review: every listed route at 360 / 768 / 1280 / 1440, light and dark.
// Usage: npm run screens -- <out-dir> [route ...]   (app must be running; default http://localhost:3000)
// Routes prefixed with "student:", "coordinator:" or "admin:" are captured signed in as a fresh
// test account of that role (created with the local service-role key).
import { mkdirSync } from "node:fs";
import { chromium, type Browser, type BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const WIDTHS: Array<[number, number]> = [[360, 740], [768, 1024], [1280, 800], [1440, 900]];
const [outDir = "docs/screenshots/latest", ...routes] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

async function signedInContext(browser: Browser, role: string, theme: string): Promise<BrowserContext> {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!, {
    auth: { persistSession: false },
  });
  const email = `screens-${role}-${Date.now()}@iskolar.test`;
  const password = "NotARealPassword1"; // test-only, local stack
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "Ana Reyes" } });
  if (error) throw error;
  if (role !== "student") await admin.from("profiles").update({ role }).eq("id", data.user.id);
  if (role === "student") {
    // The prototype's sample student, so student screens are reviewed with realistic data.
    const uid = data.user.id;
    await admin.from("student_profiles").upsert({
      user_id: uid, field: "science_math", program: "BS Biology", year_level: 2, gwa: 1.85,
      income_bracket: "150k_250k", ofw: true, region: "central_luzon", answered_family: true,
    });
    const { data: picks } = await admin.from("scholarships").select("id, slug").in("slug", ["tulong-dunong-program", "owwa-ofw-dependents-scholarship"]);
    for (const s of picks ?? []) {
      const stage = s.slug === "tulong-dunong-program" ? "preparing" : "saved";
      const { data: app } = await admin.from("applications").insert({ student_id: uid, scholarship_id: s.id, stage }).select("id").single();
      if (app && stage === "preparing") {
        const { data: docs } = await admin.from("scholarship_documents").select("id").eq("scholarship_id", s.id).order("position").limit(2);
        await admin.from("application_documents").insert((docs ?? []).map((d) => ({ application_id: app.id, document_id: d.id })));
      }
    }
  }
  const ctx = await browser.newContext({ colorScheme: theme as "light" | "dark" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.waitForSelector("html[data-hydrated]", { state: "attached" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  await page.close();
  return ctx;
}

const browser = await chromium.launch();
for (const theme of ["light", "dark"]) {
  const contexts = new Map<string, BrowserContext>();
  for (const entry of routes) {
    const [role, route] = entry.includes(":/") ? entry.split(/:(?=\/)/) : ["guest", entry];
    if (!contexts.has(role!)) {
      contexts.set(role!, role === "guest" ? await browser.newContext({ colorScheme: theme as "light" | "dark" }) : await signedInContext(browser, role!, theme));
    }
    const ctx = contexts.get(role!)!;
    for (const [w, h] of WIDTHS) {
      const page = await ctx.newPage();
      await page.setViewportSize({ width: w, height: h });
      await page.addInitScript((t) => localStorage.setItem("iskolar-theme", t), theme);
      await page.goto(BASE + route!);
      await page.waitForSelector("html[data-hydrated]", { state: "attached" });
      const name = `${route!.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"}-${w}-${theme}.png`;
      await page.screenshot({ path: `${outDir}/${role === "guest" ? "" : role + "-"}${name}`, fullPage: true });
      await page.close();
    }
  }
  for (const ctx of contexts.values()) await ctx.close();
}
await browser.close();
console.log(`Saved to ${outDir}`);
