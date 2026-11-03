import { describe, expect, it, vi } from "vitest";
import { createMailer, isRetryable, redactAddress, type MailTransport } from "./send.ts";

const message = { to: "ana@gmail.com", subject: "Tulong Dunong Program closes in 4 days", html: "<p>Hi</p>", text: "Hi" };

function setup(sendMail: MailTransport["sendMail"]) {
  const sleep = vi.fn(async () => {});
  const logger = { warn: vi.fn(), error: vi.fn() };
  const transport = { sendMail: vi.fn(sendMail) };
  const mailer = createMailer({ transport, from: '"Iskolar" <iskolar@gmail.com>', sleep, logger });
  return { mailer, transport, sleep, logger };
}

const smtpError = (props: Record<string, unknown>) => Object.assign(new Error(String(props.message ?? "smtp error")), props);

describe("sendEmail", () => {
  it("sends once and returns the message id", async () => {
    const { mailer, transport, sleep } = setup(async () => ({ messageId: "<id-1@gmail.com>" }));
    const result = await mailer.sendEmail(message);
    expect(result).toEqual({ ok: true, messageId: "<id-1@gmail.com>", attempts: 1 });
    expect(transport.sendMail).toHaveBeenCalledWith({ ...message, from: '"Iskolar" <iskolar@gmail.com>' });
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries temporary failures with exponential backoff", async () => {
    let calls = 0;
    const { mailer, sleep, logger } = setup(async () => {
      calls++;
      if (calls < 3) throw smtpError({ code: "ETIMEDOUT", message: "Connection timeout" });
      return { messageId: "<id-3@gmail.com>" };
    });
    const result = await mailer.sendEmail(message);
    expect(result).toEqual({ ok: true, messageId: "<id-3@gmail.com>", attempts: 3 });
    expect(sleep.mock.calls).toEqual([[500], [1000]]);
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("gives up after 3 attempts and returns a typed failure", async () => {
    const { mailer, transport, logger } = setup(async () => {
      throw smtpError({ code: "ECONNECTION", message: "Greeting never received", responseCode: 421 });
    });
    const result = await mailer.sendEmail(message);
    expect(transport.sendMail).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      ok: false,
      attempts: 3,
      error: { code: "ECONNECTION", message: "Greeting never received", retryable: true },
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(logger.error.mock.calls[0]![0] as string);
    expect(logged).toMatchObject({ event: "email.gave_up", attempt: 3, to: "a***@gmail.com" });
  });

  it("does not retry a rejected login or a permanent 5xx (e.g. Gmail's daily limit)", async () => {
    const auth = setup(async () => {
      throw smtpError({ code: "EAUTH", responseCode: 535, message: "Invalid login" });
    });
    expect(await auth.mailer.sendEmail(message)).toMatchObject({ ok: false, attempts: 1, error: { code: "EAUTH", retryable: false } });
    expect(auth.sleep).not.toHaveBeenCalled();

    const limit = setup(async () => {
      throw smtpError({ responseCode: 550, message: "5.4.5 Daily user sending limit exceeded" });
    });
    expect(await limit.mailer.sendEmail(message)).toMatchObject({ ok: false, attempts: 1, error: { code: "SMTP_550" } });
  });

  it("rejects invalid messages without calling the transport", async () => {
    const { mailer, transport } = setup(async () => ({ messageId: "x" }));
    for (const bad of [
      { ...message, to: "not-an-email" },
      { ...message, to: "a@b.ph, c@d.ph" },
      { ...message, subject: " " },
      { ...message, subject: "Hi\r\nBcc: everyone@example.com" },
      { ...message, html: "" },
      { ...message, text: "" },
    ]) {
      const result = await mailer.sendEmail(bad);
      expect(result).toMatchObject({ ok: false, attempts: 0, error: { code: "INVALID_MESSAGE", retryable: false } });
    }
    expect(transport.sendMail).not.toHaveBeenCalled();
  });
});

describe("helpers", () => {
  it("classifies SMTP errors", () => {
    expect(isRetryable({ code: "ETIMEDOUT" })).toBe(true);
    expect(isRetryable({ responseCode: 451 })).toBe(true);
    expect(isRetryable({ code: "EAUTH" })).toBe(false);
    expect(isRetryable({ responseCode: 552 })).toBe(false);
  });

  it("redacts addresses for logs", () => {
    expect(redactAddress("ana.reyes@up.edu.ph")).toBe("a***@up.edu.ph");
    expect(redactAddress("broken")).toBe("***");
  });
});
