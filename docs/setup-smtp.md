# Email setup (Gmail SMTP)

Iskolar sends every email through one Gmail account:

- **App emails** (deadline reminders, deadline changes, new matching scholarships, announcements) go through the mailer in `src/lib/email/`.
- **Auth emails** (sign-up verification, password reset, email change) go through Supabase Auth, configured with the same Gmail details in the Supabase dashboard.

Both use `smtp.gmail.com`, port **465**, SSL/TLS.

## 1. Create a Google App Password

Gmail won't accept your normal password over SMTP. You need an App Password, and Google only offers those when 2-Step Verification is on.

1. Sign in to the Gmail account that will send Iskolar's emails. A dedicated account, such as `iskolar.alerts@gmail.com`, is better than a personal one (see the sending limit below).
2. Turn on 2-Step Verification: go to <https://myaccount.google.com/security> → **2-Step Verification** → **Get started**, and follow the steps.
3. Open <https://myaccount.google.com/apppasswords>. If you can't find it, search "App passwords" in your Google Account settings.
4. Type a name such as `Iskolar`, then click **Create**.
5. Copy the 16-character password that appears (shown in four groups, like `xxxx xxxx xxxx xxxx`). Google shows it only once. Spaces don't matter; Iskolar removes them.

Notes:
- Changing the Google account password revokes all App Passwords, so you'll need to create a new one.
- App Passwords aren't available on accounts that use Advanced Protection, or on Google Workspace accounts where the admin has disabled them.

## 2. Fill in the environment variables

Copy `.env.example` to `.env.local` (git-ignored) and fill in:

| Variable | Value |
|---|---|
| `GMAIL_USER` | The full Gmail address, e.g. `iskolar.alerts@gmail.com` |
| `GMAIL_APP_PASSWORD` | The 16-character App Password from step 1 |
| `EMAIL_FROM_NAME` | Sender name shown in inboxes. Default `Iskolar` |
| `APP_URL` | Base URL for links in emails: `http://localhost:3000` locally, your deployed URL in production |

All four are required. The Next.js server refuses to start if any is missing or malformed (for example, a normal password instead of a 16-character App Password), and the error names the variable without showing its value. The credentials are read only in server code (`src/lib/email/index.ts` imports `server-only`), so they never reach the browser.

In production, set the same four variables in **Vercel → Project → Settings → Environment Variables**.

## 3. Send a test email

```bash
npm run email:test -- you@example.com
```

This sends one sample announcement email to that address using the settings in `.env.local`. Check the inbox, and the spam folder for the first message.

- `Sent to … (message id …)`: everything works.
- `[EAUTH] Invalid login`: Gmail rejected the address or App Password. Re-check both, or create a new App Password.
- `Email is not configured: missing …`: a variable in `.env.local` is empty.

## 4. Use the same Gmail for Supabase Auth emails

Supabase sends sign-up verification and password-reset emails itself. Point it at the same Gmail account:

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Emails** → **SMTP Settings**.
2. Turn on **Enable custom SMTP**.
3. Fill in:

   | Field | Value |
   |---|---|
   | Sender email | Your `GMAIL_USER` address. Gmail replaces any other From address with this one. |
   | Sender name | `Iskolar` |
   | Host | `smtp.gmail.com` |
   | Port number | `465` |
   | Minimum interval between emails being sent | `1` second (or keep the default) |
   | Username | Your `GMAIL_USER` address |
   | Password | The 16-character App Password |

4. Click **Save**.
5. Under **Authentication** → **Sign In / Providers** → **Email**, make sure **Confirm email** is on, so new accounts must verify before their first login.
6. Under **Authentication** → **Rate Limits**, check the email rate limit. With custom SMTP it defaults to about 30 emails an hour, which you can raise, but keep it well under Gmail's daily limit.

### Branded auth templates

The Confirm signup, Reset password and Change email templates are generated from the same layout as every other Iskolar email (`src/lib/email/templates.ts` → `supabaseAuthTemplate`):

```bash
npm run email:auth-templates   # writes supabase/templates/{confirmation,recovery,email_change}.html
```

Local Supabase uses them automatically (`supabase/config.toml`). For the cloud project, open **Authentication** → **Emails** → **Templates** and, for each template, set the subject and paste the HTML:

| Dashboard template | Subject | File |
|---|---|---|
| Confirm signup | `Confirm your Iskolar account` | `supabase/templates/confirmation.html` |
| Reset password | `Reset your Iskolar password` | `supabase/templates/recovery.html` |
| Change email address | `Confirm your new email for Iskolar` | `supabase/templates/email_change.html` |

The links in these templates go to `{{ .SiteURL }}/auth/confirm?token_hash=…`, so set **Authentication** → **URL Configuration**:
- **Site URL**: your production URL, e.g. `https://iskolar.vercel.app`.
- **Redirect URLs**: `http://localhost:3000/**` and `https://iskolar.vercel.app/**`.

**Local development:** the local Supabase stack (`npx supabase start`) doesn't use Gmail for auth emails. It catches them in Mailpit at <http://127.0.0.1:54324>, so you can test sign-up and reset flows without sending real email.

## Gmail's sending limit

A regular Gmail account can send to about **500 recipients a day** (Google Workspace accounts: about 2,000). The limit is counted per account across everything sent through it: Iskolar's reminders and announcements, Supabase's auth emails, and anything you send by hand.

When the limit is reached, Gmail rejects messages with `550 5.4.5 Daily user sending limit exceeded` for up to 24 hours. Iskolar's mailer treats this as a permanent failure: it doesn't retry, and it logs the error. That means:

- Use a dedicated Gmail account for Iskolar, not a personal one.
- Be careful with announcements to everyone. 500 students is the whole daily budget, including sign-up emails.
- If Iskolar outgrows this, switch to a transactional email provider. Only the transport in `src/lib/email/env.ts` (`gmailTransportOptions`) and the Supabase SMTP fields change; templates and callers stay the same.

## How the mailer works (for later phases)

- `sendEmail({ to, subject, html, text })` from `@/lib/email` (server code only) returns `{ ok: true, messageId, attempts }` or `{ ok: false, attempts, error: { code, message, retryable } }`. It doesn't throw for SMTP errors.
- Temporary failures (timeouts, connection drops, 4xx) are retried up to **3 attempts in total**, waiting 500 ms and then 1 s. Login failures and 5xx rejections aren't retried.
- Failures are logged as JSON (`email.send_failed`, `email.gave_up`) with the recipient redacted (`a***@gmail.com`) and no credentials.
- Templates: `deadlineReminderEmail`, `deadlineChangedEmail`, `newMatchEmail`, `announcementEmail`. Each returns `{ subject, html, text }` and includes a **Manage email preferences** link to `/settings/notifications`.
- `env.ts`, `send.ts` and `templates.ts` have no Node-only or Next-only imports, so the Supabase Edge Function for scheduled reminders (Phase 6) reuses them with `npm:nodemailer` and `Deno.env.toObject()` instead of building a second mailer.
