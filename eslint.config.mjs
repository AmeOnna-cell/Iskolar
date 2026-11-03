import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "supabase/functions/**",
      ".taste-skill/**",
      "reference/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    // The service-role client must never reach the browser. admin.ts also imports "server-only",
    // so a client import fails the build; this rule catches it earlier, in the editor.
    files: ["src/components/**/*.{ts,tsx}", "src/**/*.client.{ts,tsx}", "src/lib/supabase/client.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@/lib/supabase/admin", message: "Service-role client is server-only." },
            { name: "@/lib/email", message: "The mailer holds Gmail credentials and is server-only." },
          ],
          patterns: [
            { group: ["**/supabase/admin"], message: "Service-role client is server-only." },
            { group: ["**/lib/email", "**/lib/email/index*"], message: "The mailer is server-only." },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
