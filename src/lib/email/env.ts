// Email configuration. Runtime-neutral (no Node-only imports) so a Supabase Edge Function
// can reuse it: pass `Deno.env.toObject()` instead of `process.env`.

export const EMAIL_ENV_VARS = ["GMAIL_USER", "GMAIL_APP_PASSWORD", "EMAIL_FROM_NAME", "APP_URL"] as const;

export type EmailEnv = {
  gmailUser: string;
  /** The 16-character Google App Password, spaces removed. */
  gmailAppPassword: string;
  fromName: string;
  /** Base URL for links in emails, without a trailing slash. */
  appUrl: string;
  /** Local development only: a test inbox (Supabase's Mailpit) instead of Gmail. */
  devSmtp?: { host: string; port: number };
};

export class EmailConfigError extends Error {
  override name = "EmailConfigError";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reads and validates the email settings. Throws one EmailConfigError naming every problem (never the values). */
export function readEmailEnv(source: Record<string, string | undefined>): EmailEnv {
  const problems: string[] = [];
  const missing = EMAIL_ENV_VARS.filter((name) => !source[name]?.trim());
  if (missing.length) problems.push(`missing ${missing.join(", ")}`);

  const gmailUser = source.GMAIL_USER?.trim() ?? "";
  if (gmailUser && !EMAIL_RE.test(gmailUser)) problems.push("GMAIL_USER must be a full Gmail address");

  const gmailAppPassword = (source.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "");
  if (gmailAppPassword && gmailAppPassword.length !== 16) {
    problems.push("GMAIL_APP_PASSWORD must be the 16-character Google App Password, not your normal Gmail password");
  }

  const rawUrl = source.APP_URL?.trim() ?? "";
  let appUrl = "";
  if (rawUrl) {
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("protocol");
      appUrl = url.origin + url.pathname.replace(/\/+$/, "");
    } catch {
      problems.push("APP_URL must be a full http(s) URL, like https://iskolar.example.com");
    }
  }

  // EMAIL_DEV_SMTP=127.0.0.1:54325 sends to the local Mailpit inbox. Only a loopback address is
  // accepted, so a stray value in production can't send mail anywhere but Gmail.
  let devSmtp: EmailEnv["devSmtp"];
  const dev = source.EMAIL_DEV_SMTP?.trim();
  if (dev) {
    const m = /^(127\.0\.0\.1|localhost):(\d{2,5})$/.exec(dev);
    if (m) devSmtp = { host: m[1]!, port: Number(m[2]) };
    else problems.push("EMAIL_DEV_SMTP must be 127.0.0.1:<port> or localhost:<port>");
  }

  if (problems.length) {
    throw new EmailConfigError(
      `Email is not configured: ${problems.join("; ")}. ` +
        "Set these in .env.local (see .env.example and docs/setup-smtp.md).",
    );
  }

  return { gmailUser, gmailAppPassword, fromName: source.EMAIL_FROM_NAME!.trim(), appUrl, ...(devSmtp ? { devSmtp } : {}) };
}

/** nodemailer transport options for Gmail SMTP over implicit TLS (port 465). */
export function gmailTransportOptions(env: EmailEnv) {
  return {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: env.gmailUser, pass: env.gmailAppPassword },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  };
}

/** The local test inbox when EMAIL_DEV_SMTP is set (plain SMTP, no login), otherwise Gmail. */
export function transportOptions(env: EmailEnv) {
  if (env.devSmtp) return { host: env.devSmtp.host, port: env.devSmtp.port, secure: false, ignoreTLS: true };
  return gmailTransportOptions(env);
}

/** `"Iskolar" <address>`. Gmail rewrites any other From address, so the account address is always used. */
export function fromHeader(env: EmailEnv): string {
  return `"${env.fromName.replace(/["\\\r\n]/g, "")}" <${env.gmailUser}>`;
}
