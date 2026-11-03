// Sends one test email through the real Gmail SMTP settings in .env.local.
// Usage: npm run email:test -- you@example.com
import { announcementEmail, emailAppUrl, EmailConfigError, sendEmail } from "../src/lib/email/index.ts";

const to = process.argv[2];
if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.error("Usage: npm run email:test -- you@example.com");
  process.exit(2);
}

try {
  const email = announcementEmail({
    appUrl: emailAppUrl(),
    title: "Iskolar test email",
    body: "If you can read this, Gmail SMTP is set up correctly.\n\nDeadline reminders, deadline changes, new matching scholarships and announcements will be sent the same way.",
    from: "Iskolar setup check",
    path: "/",
  });
  const result = await sendEmail({ to, ...email });
  if (result.ok) {
    console.log(`Sent to ${to} (message id ${result.messageId}, ${result.attempts} attempt${result.attempts === 1 ? "" : "s"}).`);
    console.log("Check the inbox and the spam folder.");
  } else {
    console.error(`Not sent after ${result.attempts} attempt(s): [${result.error.code}] ${result.error.message}`);
    if (result.error.code === "EAUTH") {
      console.error("Gmail rejected the login. Check GMAIL_USER and GMAIL_APP_PASSWORD (see docs/setup-smtp.md).");
    }
    process.exit(1);
  }
} catch (err) {
  if (err instanceof EmailConfigError) {
    console.error(err.message);
    process.exit(2);
  }
  throw err;
}
