import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getMockSmsAdapter,
  getSmsAdapter,
  normalizePhone,
} from "./adapter";

describe("normalizePhone", () => {
  it("returns null for empty input", () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });

  it("formats a 10-digit US number as E.164", () => {
    expect(normalizePhone("5551234567")).toBe("+15551234567");
  });

  it("formats common written forms to E.164", () => {
    expect(normalizePhone("(555) 123-4567")).toBe("+15551234567");
    expect(normalizePhone("555-123-4567")).toBe("+15551234567");
    expect(normalizePhone("555.123.4567")).toBe("+15551234567");
  });

  it("preserves a number already in E.164", () => {
    expect(normalizePhone("+15551234567")).toBe("+15551234567");
  });

  it("handles a leading 1 without +", () => {
    expect(normalizePhone("15551234567")).toBe("+15551234567");
  });

  it("returns null for malformed numbers", () => {
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
  });
});

describe("getSmsAdapter", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_FROM_NUMBER;
    getMockSmsAdapter().reset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns the mock adapter when env vars are missing", () => {
    expect(getSmsAdapter().kind).toBe("mock");
  });

  it("returns the Twilio adapter when all env vars are present", () => {
    process.env.TWILIO_ACCOUNT_SID = "AC_test";
    process.env.TWILIO_AUTH_TOKEN = "tok_test";
    process.env.TWILIO_FROM_NUMBER = "+15550000000";
    expect(getSmsAdapter().kind).toBe("twilio");
  });

  it("falls back to mock when one env var is missing", () => {
    process.env.TWILIO_ACCOUNT_SID = "AC_test";
    process.env.TWILIO_AUTH_TOKEN = "tok_test";
    // TWILIO_FROM_NUMBER intentionally absent
    expect(getSmsAdapter().kind).toBe("mock");
  });
});

describe("MockSmsAdapter", () => {
  beforeEach(() => {
    getMockSmsAdapter().reset();
  });

  it("captures sends with normalized recipient and assigns a messageId", async () => {
    const adapter = getMockSmsAdapter();
    const res = await adapter.send({
      to: "(555) 999-0000",
      body: "Hi from the test",
      context: { appointmentId: "appt_1" },
    });
    expect(res.ok).toBe(true);
    expect(res.messageId).toMatch(/^mock_/);
    const sent = adapter.getSent();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("+15559990000");
    expect(sent[0].body).toBe("Hi from the test");
    expect(sent[0].context?.appointmentId).toBe("appt_1");
  });

  it("refuses an unrecoverable phone number", async () => {
    const adapter = getMockSmsAdapter();
    const res = await adapter.send({ to: "abc", body: "Hello" });
    expect(res.ok).toBe(false);
    expect(res.error).toBeDefined();
    expect(adapter.getSent()).toHaveLength(0);
  });

  it("refuses an empty body", async () => {
    const adapter = getMockSmsAdapter();
    const res = await adapter.send({ to: "+15551234567", body: "   " });
    expect(res.ok).toBe(false);
  });

  it("reset() clears captured sends", async () => {
    const adapter = getMockSmsAdapter();
    await adapter.send({ to: "+15551234567", body: "one" });
    expect(adapter.getSent()).toHaveLength(1);
    adapter.reset();
    expect(adapter.getSent()).toHaveLength(0);
  });
});
