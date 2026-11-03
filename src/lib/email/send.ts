// Transport-agnostic sender with retry. Runtime-neutral so a Supabase Edge Function can reuse it
// with its own nodemailer transport (`npm:nodemailer`).

export type EmailMessage = { to: string; subject: string; html: string; text: string };

export type SendResult =
  | { ok: true; messageId: string; attempts: number }
  | { ok: false; attempts: number; error: { code: string; message: string; retryable: boolean } };

/** The part of a nodemailer transport this module uses (easy to mock). */
export interface MailTransport {
  sendMail(message: EmailMessage & { from: string }): Promise<{ messageId?: string }>;
}

export type Logger = Pick<Console, "warn" | "error">;

export type MailerOptions = {
  transport: MailTransport;
  from: string;
  /** Total tries including the first. Default 3. */
  maxAttempts?: number;
  /** Wait before retry n is baseDelayMs × 2^(n−1): 500 ms, then 1 s by default. */
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  logger?: Logger;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// SMTP failures that will not get better by trying again right away.
const PERMANENT_CODES = new Set(["EAUTH", "EENVELOPE", "EMESSAGE", "EINVALID"]);

type SmtpError = { code?: string; responseCode?: number; message?: string };

export function isRetryable(err: SmtpError): boolean {
  if (err.code && PERMANENT_CODES.has(err.code)) return false;
  // 5xx is permanent (bad recipient, rejected, Gmail's daily sending limit "550 5.4.5"); 4xx is temporary.
  if (typeof err.responseCode === "number" && err.responseCode >= 500) return false;
  return true;
}

/** "ana@gmail.com" → "a***@gmail.com", so logs identify a failure without storing addresses. */
export function redactAddress(address: string): string {
  const at = address.lastIndexOf("@");
  return at > 0 ? `${address[0]}***${address.slice(at)}` : "***";
}

function validate(msg: EmailMessage): string | null {
  if (!msg || typeof msg !== "object") return "message is required";
  if (typeof msg.to !== "string" || !EMAIL_RE.test(msg.to.trim())) return "to must be one valid email address";
  if (typeof msg.subject !== "string" || !msg.subject.trim()) return "subject is required";
  if (/[\r\n]/.test(msg.subject)) return "subject must be one line";
  if (typeof msg.html !== "string" || !msg.html.trim()) return "html is required";
  if (typeof msg.text !== "string" || !msg.text.trim()) return "text is required";
  return null;
}

export function createMailer(options: MailerOptions) {
  const {
    transport,
    from,
    maxAttempts = 3,
    baseDelayMs = 500,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    logger = console,
  } = options;

  async function sendEmail(message: EmailMessage): Promise<SendResult> {
    const invalid = validate(message);
    if (invalid) {
      return { ok: false, attempts: 0, error: { code: "INVALID_MESSAGE", message: invalid, retryable: false } };
    }
    const to = message.to.trim();

    for (let attempt = 1; ; attempt++) {
      try {
        const info = await transport.sendMail({ from, to, subject: message.subject, html: message.html, text: message.text });
        return { ok: true, messageId: info.messageId ?? "", attempts: attempt };
      } catch (raw) {
        const err = (raw ?? {}) as SmtpError;
        const retryable = isRetryable(err);
        const code = err.code ?? (err.responseCode ? `SMTP_${err.responseCode}` : "UNKNOWN");
        const detail = {
          event: "email.send_failed",
          attempt,
          maxAttempts,
          code,
          responseCode: err.responseCode,
          retryable,
          to: redactAddress(to),
          subject: message.subject,
          message: err.message,
        };
        if (!retryable || attempt >= maxAttempts) {
          logger.error(JSON.stringify({ ...detail, event: "email.gave_up" }));
          return {
            ok: false,
            attempts: attempt,
            error: { code, message: err.message ?? "Unknown email error", retryable },
          };
        }
        logger.warn(JSON.stringify(detail));
        await sleep(baseDelayMs * 2 ** (attempt - 1));
      }
    }
  }

  return { sendEmail };
}

export type Mailer = ReturnType<typeof createMailer>;
