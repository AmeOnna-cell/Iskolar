import { describe, expect, it } from "vitest";
import { EmailConfigError, fromHeader, gmailTransportOptions, readEmailEnv } from "./env.ts";

const valid = {
  GMAIL_USER: "not-a-real-account@example.com",
  GMAIL_APP_PASSWORD: "fake fake fake fake", // not a real password
  EMAIL_FROM_NAME: "Iskolar",
  APP_URL: "https://iskolar.example.com/",
};

describe("readEmailEnv", () => {
  it("normalises a valid configuration", () => {
    expect(readEmailEnv(valid)).toEqual({
      gmailUser: "not-a-real-account@example.com",
      gmailAppPassword: "fakefakefakefake",
      fromName: "Iskolar",
      appUrl: "https://iskolar.example.com",
    });
  });

  it("names every missing variable in one clear error", () => {
    expect(() => readEmailEnv({})).toThrowError(EmailConfigError);
    expect(() => readEmailEnv({ EMAIL_FROM_NAME: "Iskolar" })).toThrowError(
      /missing GMAIL_USER, GMAIL_APP_PASSWORD, APP_URL.*\.env\.example/,
    );
  });

  it("catches common mistakes without echoing secrets", () => {
    let message = "";
    try {
      readEmailEnv({ ...valid, GMAIL_APP_PASSWORD: "not-an-app-password-test-value", APP_URL: "iskolar.ph" });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toMatch(/16-character Google App Password/);
    expect(message).toMatch(/APP_URL must be a full http\(s\) URL/);
    expect(message).not.toContain("not-an-app-password-test-value");
  });
});

describe("Gmail transport", () => {
  it("uses smtp.gmail.com:465 over TLS with the account as sender", () => {
    const env = readEmailEnv(valid);
    expect(gmailTransportOptions(env)).toMatchObject({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: "not-a-real-account@example.com", pass: "fakefakefakefake" },
    });
    expect(fromHeader(env)).toBe('"Iskolar" <not-a-real-account@example.com>');
    expect(fromHeader({ ...env, fromName: 'Iskolar "Alerts"\r\n' })).toBe('"Iskolar Alerts" <not-a-real-account@example.com>');
  });
});
