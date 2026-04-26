import { describe, it, expect } from "vitest";
import {
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  buildOtpAuthUrl,
} from "./totp";

const FIXED_T = 1_700_000_000; // 2023-11-14T22:13:20Z, aligned to 30s

describe("generateTotpSecret", () => {
  it("produces a 32-character base32 string", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).toMatch(/^[A-Z2-7]{32}$/);
    expect(a).not.toBe(b);
  });
});

describe("generateTotpCode + verifyTotpCode", () => {
  it("verifies a code generated for the same time step", () => {
    const secret = generateTotpSecret();
    const code = generateTotpCode(secret, FIXED_T);
    expect(verifyTotpCode(secret, code, FIXED_T)).toBe(true);
  });

  it("verifies a code from the previous time step (clock drift tolerance)", () => {
    const secret = generateTotpSecret();
    const codeAtPriorStep = generateTotpCode(secret, FIXED_T - 30);
    expect(verifyTotpCode(secret, codeAtPriorStep, FIXED_T)).toBe(true);
  });

  it("verifies a code from the next time step (clock drift tolerance)", () => {
    const secret = generateTotpSecret();
    const codeAtNextStep = generateTotpCode(secret, FIXED_T + 30);
    expect(verifyTotpCode(secret, codeAtNextStep, FIXED_T)).toBe(true);
  });

  it("rejects a code from outside the drift window", () => {
    const secret = generateTotpSecret();
    const stale = generateTotpCode(secret, FIXED_T - 120);
    expect(verifyTotpCode(secret, stale, FIXED_T)).toBe(false);
  });

  it("rejects a malformed code", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpCode(secret, "12345", FIXED_T)).toBe(false);
    expect(verifyTotpCode(secret, "abcdef", FIXED_T)).toBe(false);
    expect(verifyTotpCode(secret, "", FIXED_T)).toBe(false);
  });

  it("known-answer test (RFC 6238 Appendix B vector with a 20-byte ASCII secret)", () => {
    // RFC 6238 reference: secret '12345678901234567890', T=59 → 94287082.
    // Convert ASCII to base32 to feed our generator.
    const secret = base32EncodeAscii("12345678901234567890");
    const code = generateTotpCode(secret, 59);
    expect(code).toBe("287082"); // last 6 digits of the RFC reference
  });
});

describe("buildOtpAuthUrl", () => {
  it("returns a properly-formatted otpauth:// URL", () => {
    const url = buildOtpAuthUrl({
      secret: "JBSWY3DPEHPK3PXP",
      accountLabel: "scott@example.com",
      issuer: "Leafjourney",
    });
    expect(url.startsWith("otpauth://totp/")).toBe(true);
    expect(url).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(url).toContain("issuer=Leafjourney");
    expect(url).toContain("digits=6");
    expect(url).toContain("period=30");
  });
});

// Helper to convert an ASCII string to base32 — only for the known-
// answer test. The production path generates random bytes.
function base32EncodeAscii(s: string): string {
  const buf = Buffer.from(s, "ascii");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += alphabet[(value << (5 - bits)) & 0x1f];
  }
  return out;
}
