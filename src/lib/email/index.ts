import "server-only";
import nodemailer from "nodemailer";
import { fromHeader, readEmailEnv, transportOptions } from "./env.ts";
import { createMailer, type EmailMessage, type Mailer, type SendResult } from "./send.ts";

export * from "./templates.ts";
export { EmailConfigError, readEmailEnv } from "./env.ts";
export type { EmailMessage, SendResult } from "./send.ts";

let mailer: Mailer | null = null;

function getMailer(): Mailer {
  if (!mailer) {
    const env = readEmailEnv(process.env);
    mailer = createMailer({
      transport: nodemailer.createTransport(transportOptions(env)),
      from: fromHeader(env),
    });
  }
  return mailer;
}

/**
 * Sends one email through Gmail SMTP. Retries temporary failures (3 tries, 500 ms then 1 s backoff),
 * logs failures without credentials, and never throws for SMTP errors: check `result.ok`.
 * Throws EmailConfigError only when the email environment variables are missing or invalid.
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  return getMailer().sendEmail(message);
}

/** Base URL for links in emails (APP_URL). */
export function emailAppUrl(): string {
  return readEmailEnv(process.env).appUrl;
}
