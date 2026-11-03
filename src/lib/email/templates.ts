// Email templates: HTML (inline CSS, table layout, 600px max) + plain text.
// Pure and runtime-neutral, so the Supabase Edge Function that sends reminders reuses them.

export type RenderedEmail = { subject: string; html: string; text: string };

/** Where "Manage email preferences" points. */
export const PREFERENCES_PATH = "/settings/notifications";

// Brand values from DESIGN.md (light theme; email clients get one fixed palette).
const C = {
  band: "#0F2C6E",
  canvas: "#F3F4F6",
  surface: "#FFFFFF",
  hairline: "#E1E4EA",
  ink: "#1D2433",
  ink2: "#545E70",
  hint: "#646D7E",
  primary: "#1F4FD1",
  ok: "#11703F",
  okWash: "#E6F5EC",
  warn: "#8F5300",
  warnWash: "#FFF3D9",
  danger: "#B42318",
  dangerWash: "#FDECEA",
};
const FONT = "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** Joins the app URL and an in-app path. Only same-site paths are allowed, so links can't point elsewhere. */
export function appLink(appUrl: string, path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error(`Email link path must start with "/": ${path}`);
  return appUrl.replace(/\/+$/, "") + path;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDate(iso: string): Date {
  const m = DATE_RE.exec(iso);
  if (!m) throw new Error(`Expected a YYYY-MM-DD date, got: ${iso}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** "2026-11-07" → "Sat, Nov 7, 2026". Calendar dates, so no time-zone shift. */
export function formatDate(iso: string): string {
  return parseDate(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseDate(toIso).getTime() - parseDate(fromIso).getTime()) / 86_400_000);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function greeting(name?: string | null): string {
  const first = name?.trim().split(/\s+/)[0];
  return first ? `Hi ${first},` : "Hi,";
}

// ---------- Shared layout ----------

type Tone = "danger" | "warn" | "ok" | "info";

type LayoutInput = {
  appUrl: string;
  preheader: string;
  heading: string;
  /** Already-escaped HTML paragraphs. */
  paragraphs: string[];
  status?: { tone: Tone; text: string };
  cta?: { label: string; path: string };
  footnote?: string;
  /** "alerts" (default): preferences link. "account": security email, no preferences link. */
  footer?: "alerts" | "account";
};

function statusColors(tone: Tone) {
  if (tone === "danger") return [C.danger, C.dangerWash];
  if (tone === "warn") return [C.warn, C.warnWash];
  if (tone === "ok") return [C.ok, C.okWash];
  return [C.primary, "#EDF2FF"];
}

function renderHtml(input: LayoutInput): string {
  const p = (html: string) =>
    `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.55;color:${C.ink};">${html}</p>`;
  const status = input.status
    ? (() => {
        const [fg, bg] = statusColors(input.status.tone);
        return `<p style="margin:0 0 16px;padding:12px 16px;border-radius:6px;background:${bg};font-family:${FONT};font-size:14px;line-height:1.5;font-weight:600;color:${fg};">${escapeHtml(input.status.text)}</p>`;
      })()
    : "";
  const cta = input.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="border-radius:6px;background:${C.primary};">
        <a href="${escapeHtml(appLink(input.appUrl, input.cta.path))}" style="display:inline-block;padding:12px 20px;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;color:#FFFFFF;text-decoration:none;border-radius:6px;">${escapeHtml(input.cta.label)}</a>
      </td></tr></table>`
    : "";
  const footnote = input.footnote
    ? `<p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.45;color:${C.ink2};">${escapeHtml(input.footnote)}</p>`
    : "";
  const footer =
    input.footer === "account"
      ? `<p style="margin:0 0 8px;">You're getting this email because this address was used with an Iskolar account. If that wasn't you, you can ignore it: nothing changes until the link is opened.</p>`
      : `<p style="margin:0 0 8px;">You're getting this email because email alerts are turned on in your Iskolar account.</p>
      <p style="margin:0 0 8px;"><a href="${escapeHtml(appLink(input.appUrl, PREFERENCES_PATH))}" style="color:${C.primary};text-decoration:underline;">Manage email preferences</a></p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(input.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${C.canvas};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.canvas};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
    <tr><td style="padding:16px 24px;background:${C.band};border-radius:8px 8px 0 0;font-family:${FONT};font-size:20px;font-weight:700;letter-spacing:-0.01em;color:#FFFFFF;">Iskolar</td></tr>
    <tr><td style="padding:32px 24px 24px;background:${C.surface};border:1px solid ${C.hairline};border-top:0;border-radius:0 0 8px 8px;">
      <h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:700;color:${C.ink};">${escapeHtml(input.heading)}</h1>
      ${status}
      ${input.paragraphs.map(p).join("\n      ")}
      ${cta}
      ${footnote}
    </td></tr>
    <tr><td style="padding:24px;font-family:${FONT};font-size:13px;line-height:1.45;color:${C.hint};">
      ${footer}
      <p style="margin:0;">Always confirm scholarship details with the official source before you apply.</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function renderText(input: { appUrl: string; heading: string; lines: string[]; cta?: { label: string; path: string }; footnote?: string }): string {
  const parts = [input.heading, "", ...input.lines];
  if (input.cta) parts.push("", `${input.cta.label}: ${appLink(input.appUrl, input.cta.path)}`);
  if (input.footnote) parts.push("", input.footnote);
  parts.push(
    "",
    "--",
    "You're getting this email because email alerts are turned on in your Iskolar account.",
    `Manage email preferences: ${appLink(input.appUrl, PREFERENCES_PATH)}`,
    "Always confirm scholarship details with the official source before you apply.",
  );
  return parts.join("\n");
}

// ---------- 1. Deadline reminder ----------

export type DeadlineReminderData = {
  appUrl: string;
  studentName?: string | null;
  scholarshipName: string;
  providerName: string;
  /** YYYY-MM-DD */
  closesOn: string;
  daysLeft: number;
  documentsLeft: number;
  documentsTotal: number;
  /** In-app path, e.g. /s/tdp */
  scholarshipPath: string;
};

function whenText(daysLeft: number): string {
  if (daysLeft <= 0) return "closes today";
  if (daysLeft === 1) return "closes tomorrow";
  return `closes in ${plural(daysLeft, "day")}`;
}

export function deadlineReminderEmail(d: DeadlineReminderData): RenderedEmail {
  const when = whenText(d.daysLeft);
  const subject = `${d.scholarshipName} ${when}`;
  const deadline = `${d.scholarshipName} from ${d.providerName} ${when}, on ${formatDate(d.closesOn)}.`;
  const docs =
    d.documentsLeft > 0
      ? `You still have ${d.documentsLeft} of ${plural(d.documentsTotal, "document")} to prepare. Check where to get each one in your checklist.`
      : `All ${plural(d.documentsTotal, "document")} are ready. Submit your application before the deadline.`;
  const tone: Tone = d.daysLeft <= 3 ? "danger" : d.daysLeft <= 7 ? "warn" : "info";
  const statusText = d.daysLeft <= 0 ? "Deadline: today" : `Deadline: ${formatDate(d.closesOn)} (${plural(d.daysLeft, "day")} left)`;
  const cta = { label: d.documentsLeft > 0 ? "Open my checklist" : "View scholarship", path: d.scholarshipPath };

  return {
    subject,
    html: renderHtml({
      appUrl: d.appUrl,
      preheader: docs,
      heading: subject,
      status: { tone, text: statusText },
      paragraphs: [escapeHtml(greeting(d.studentName)), escapeHtml(deadline), escapeHtml(docs)],
      cta,
    }),
    text: renderText({ appUrl: d.appUrl, heading: subject, lines: [greeting(d.studentName), "", deadline, "", docs], cta }),
  };
}

// ---------- 2. Deadline changed ----------

export type DeadlineChangedData = {
  appUrl: string;
  studentName?: string | null;
  scholarshipName: string;
  providerName: string;
  previousClosesOn: string;
  newClosesOn: string;
  scholarshipPath: string;
};

export function deadlineChangedEmail(d: DeadlineChangedData): RenderedEmail {
  const shift = daysBetween(d.previousClosesOn, d.newClosesOn);
  const subject = `Deadline moved: ${d.scholarshipName} now closes ${formatDate(d.newClosesOn)}`;
  const change = `${d.providerName} changed the deadline for ${d.scholarshipName}. It now closes on ${formatDate(d.newClosesOn)} (it was ${formatDate(d.previousClosesOn)}).`;
  const impact =
    shift < 0
      ? `That's ${plural(-shift, "day")} earlier, so you have less time to get your documents ready.`
      : shift > 0
        ? `That's ${plural(shift, "day")} later.`
        : "The date is the same, but other details may have changed.";
  const cta = { label: "View scholarship", path: d.scholarshipPath };

  return {
    subject,
    html: renderHtml({
      appUrl: d.appUrl,
      preheader: impact,
      heading: "A deadline you're tracking has moved",
      status: { tone: shift < 0 ? "danger" : "warn", text: `New deadline: ${formatDate(d.newClosesOn)}` },
      paragraphs: [escapeHtml(greeting(d.studentName)), escapeHtml(change), escapeHtml(impact)],
      cta,
    }),
    text: renderText({
      appUrl: d.appUrl,
      heading: "A deadline you're tracking has moved",
      lines: [greeting(d.studentName), "", change, "", impact],
      cta,
    }),
  };
}

// ---------- 3. New matching scholarship ----------

export type NewMatchData = {
  appUrl: string;
  studentName?: string | null;
  scholarshipName: string;
  providerName: string;
  /** Display text, e.g. "₱15,000 a year" */
  amount: string;
  verdict: "yes" | "maybe";
  /** YYYY-MM-DD, when known */
  closesOn?: string | null;
  scholarshipPath: string;
};

export function newMatchEmail(d: NewMatchData): RenderedEmail {
  const subject =
    d.verdict === "yes"
      ? `New scholarship you qualify for: ${d.scholarshipName}`
      : `New scholarship you might qualify for: ${d.scholarshipName}`;
  const intro = `${d.providerName} posted ${d.scholarshipName} (${d.amount}).`;
  const fit =
    d.verdict === "yes"
      ? "Based on your answers, you meet every requirement we can check."
      : "Based on your answers, you might qualify. Answer the missing questions to find out.";
  const deadline = d.closesOn ? `Applications close on ${formatDate(d.closesOn)}.` : null;
  const disclaimer = `This is a preliminary check based on your answers, not an official decision. ${d.providerName} makes the final call.`;
  const cta = { label: d.verdict === "yes" ? "See requirements" : "Check if I qualify", path: d.scholarshipPath };
  const lines = [intro, fit, ...(deadline ? [deadline] : [])];

  return {
    subject,
    html: renderHtml({
      appUrl: d.appUrl,
      preheader: fit,
      heading: d.verdict === "yes" ? "A new scholarship matches you" : "A new scholarship might match you",
      status: d.verdict === "yes" ? { tone: "ok", text: "You qualify" } : { tone: "warn", text: "Might qualify" },
      paragraphs: [escapeHtml(greeting(d.studentName)), ...lines.map(escapeHtml)],
      cta,
      footnote: disclaimer,
    }),
    text: renderText({
      appUrl: d.appUrl,
      heading: subject,
      lines: [greeting(d.studentName), "", ...lines.flatMap((l) => [l, ""]).slice(0, -1)],
      cta,
      footnote: disclaimer,
    }),
  };
}

// ---------- 4. Announcement ----------

export type AnnouncementData = {
  appUrl: string;
  title: string;
  /** Plain text. Blank lines separate paragraphs. */
  body: string;
  /** Who posted it, e.g. "CHED Regional Office III" */
  from: string;
  /** Optional in-app path to read more */
  path?: string | null;
};

export function announcementEmail(d: AnnouncementData): RenderedEmail {
  const paragraphs = d.body
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean);
  const cta = d.path ? { label: "Read on Iskolar", path: d.path } : undefined;
  const subject = d.title.replace(/[\r\n]+/g, " ").trim();
  const byline = `Posted by ${d.from}`;

  return {
    subject,
    html: renderHtml({
      appUrl: d.appUrl,
      preheader: paragraphs[0] ?? subject,
      heading: subject,
      paragraphs: [
        ...paragraphs.map((para) => escapeHtml(para).replace(/\n/g, "<br>")),
        `<span style="font-size:14px;color:${C.ink2};">${escapeHtml(byline)}</span>`,
      ],
      cta,
    }),
    text: renderText({
      appUrl: d.appUrl,
      heading: subject,
      lines: [...paragraphs.flatMap((para) => [para, ""]), byline],
      cta,
    }),
  };
}

// ---------- 5. Supabase Auth templates (Confirm signup, Reset password, Change email) ----------
//
// Supabase sends these itself (Gmail SMTP, docs/setup-smtp.md); they are generated from the same
// layout so every Iskolar email looks alike. Output contains Go template placeholders that
// Supabase fills in: {{ .SiteURL }}, {{ .TokenHash }}, {{ .Email }}, {{ .NewEmail }}.
// Run `npm run email:auth-templates` to regenerate supabase/templates/*.html.

export type AuthTemplateKind = "confirmation" | "recovery" | "email_change";

const SITE = "{{ .SiteURL }}";

export function supabaseAuthTemplate(kind: AuthTemplateKind): { subject: string; html: string } {
  if (kind === "confirmation") {
    return {
      subject: "Confirm your Iskolar account",
      html: renderHtml({
        appUrl: SITE,
        preheader: "One click to finish creating your account.",
        heading: "Confirm your email",
        paragraphs: [
          "Thanks for signing up for Iskolar. Confirm this email address to finish creating your account.",
          "Next, you'll answer a few questions about your studies so we can show which scholarships you qualify for.",
        ],
        cta: { label: "Confirm my email", path: "/auth/confirm?token_hash={{ .TokenHash }}&type=email" },
        footnote: "This link works once and expires in 1 hour.",
        footer: "account",
      }),
    };
  }
  if (kind === "recovery") {
    return {
      subject: "Reset your Iskolar password",
      html: renderHtml({
        appUrl: SITE,
        preheader: "Use this link to set a new password.",
        heading: "Reset your password",
        paragraphs: [
          "Someone asked to reset the password for the Iskolar account with this email address.",
          "If it was you, open the link below and choose a new password. Saving it signs you out on your other devices.",
        ],
        cta: { label: "Set a new password", path: "/auth/confirm?token_hash={{ .TokenHash }}&type=recovery" },
        footnote: "This link works once and expires in 1 hour. If you didn't ask for this, ignore this email: your password stays the same.",
        footer: "account",
      }),
    };
  }
  return {
    subject: "Confirm your new email for Iskolar",
    html: renderHtml({
      appUrl: SITE,
      preheader: "Confirm the change to your account's email address.",
      heading: "Confirm your new email",
      paragraphs: [
        "You asked to change your Iskolar account's email from {{ .Email }} to {{ .NewEmail }}.",
        "Confirm the change to start getting reminders and sign-in emails at the new address.",
      ],
      cta: { label: "Confirm the new email", path: "/auth/confirm?token_hash={{ .TokenHash }}&type=email_change" },
      footnote: "This link works once and expires in 1 hour. If you didn't ask for this, ignore this email and your email stays the same.",
      footer: "account",
    }),
  };
}
