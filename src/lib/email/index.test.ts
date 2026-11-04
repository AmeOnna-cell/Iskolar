import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();
const createTransport = vi.fn(() => ({ sendMail }));
vi.mock("nodemailer", () => ({ default: { createTransport } }));

const ENV = {
  GMAIL_USER: "not-a-real-account@example.com",
  GMAIL_APP_PASSWORD: "fakefakefakefake", // not a real password
  EMAIL_FROM_NAME: "Iskolar",
  APP_URL: "http://localhost:3000",
};

describe("server mailer wiring (transport mocked: nothing is sent)", () => {
  beforeEach(() => {
    vi.resetModules();
    sendMail.mockReset();
    createTransport.mockClear();
    for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
    vi.stubEnv("EMAIL_DEV_SMTP", ""); // a developer's local test-inbox setting must not leak in
  });
  afterEach(() => vi.unstubAllEnvs());

  it("builds one Gmail transport from env and sends through it", async () => {
    sendMail.mockResolvedValue({ messageId: "<ok@gmail.com>" });
    const { sendEmail, emailAppUrl } = await import("./index.ts");
    const msg = { to: "ana@gmail.com", subject: "Test", html: "<p>Test</p>", text: "Test" };

    expect(await sendEmail(msg)).toEqual({ ok: true, messageId: "<ok@gmail.com>", attempts: 1 });
    await sendEmail(msg);
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "smtp.gmail.com", port: 465, secure: true }),
    );
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: '"Iskolar" <not-a-real-account@example.com>' }));
    expect(emailAppUrl()).toBe("http://localhost:3000");
  });

  it("refuses to send when configuration is missing", async () => {
    vi.stubEnv("GMAIL_APP_PASSWORD", "");
    const { sendEmail, EmailConfigError } = await import("./index.ts");
    await expect(
      sendEmail({ to: "ana@gmail.com", subject: "Test", html: "<p>x</p>", text: "x" }),
    ).rejects.toBeInstanceOf(EmailConfigError);
    expect(createTransport).not.toHaveBeenCalled();
  });
});
