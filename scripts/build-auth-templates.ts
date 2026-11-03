// Writes supabase/templates/*.html from src/lib/email/templates.ts (one layout for every email).
// Local Supabase reads them via supabase/config.toml; for the cloud project, paste each file into
// Dashboard → Authentication → Emails → Templates (docs/setup-smtp.md).
import { mkdirSync, writeFileSync } from "node:fs";
import { supabaseAuthTemplate, type AuthTemplateKind } from "../src/lib/email/templates.ts";

const kinds: AuthTemplateKind[] = ["confirmation", "recovery", "email_change"];
mkdirSync("supabase/templates", { recursive: true });
for (const kind of kinds) {
  const { subject, html } = supabaseAuthTemplate(kind);
  writeFileSync(`supabase/templates/${kind}.html`, html + "\n");
  console.log(`supabase/templates/${kind}.html  (subject: "${subject}")`);
}
