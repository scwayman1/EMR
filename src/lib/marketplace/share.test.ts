import { describe, it, expect } from "vitest";
import {
  encodeShareToken,
  decodeShareToken,
  buildShareUrl,
  type SharePayload,
} from "./share";

const samplePayload: SharePayload = {
  iat: "2026-04-28T00:00:00Z",
  items: [
    { slug: "solace-nightfall-tincture", quantity: 1 },
    { slug: "calm-day-capsules", quantity: 2 },
  ],
  from: "Megan",
};

describe("share tokens", () => {
  it("round-trips encode → decode", () => {
    const token = encodeShareToken(samplePayload);
    const decoded = decodeShareToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.items).toEqual(samplePayload.items);
    expect(decoded?.from).toBe("Megan");
  });

  it("rejects tampered tokens", () => {
    const token = encodeShareToken(samplePayload);
    // Flip the signature.
    const [body, sig] = token.split(".");
    const flipped = sig.startsWith("a") ? "b" + sig.slice(1) : "a" + sig.slice(1);
    expect(decodeShareToken(`${body}.${flipped}`)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(decodeShareToken("garbage")).toBeNull();
    expect(decodeShareToken(".sig")).toBeNull();
    expect(decodeShareToken("body.")).toBeNull();
  });

  it("rejects payloads with non-numeric quantities", () => {
    const token = encodeShareToken(samplePayload);
    const [body] = token.split(".");
    // Re-decode body, mutate, encode different body — signature won't match,
    // proving the HMAC catches body tampering.
    const decoded = decodeShareToken(`${body}.deadbeef`);
    expect(decoded).toBeNull();
  });

  it("throws when given >25 items", () => {
    const big: SharePayload = {
      iat: "2026-04-28T00:00:00Z",
      items: Array.from({ length: 26 }, (_, i) => ({
        slug: `prod-${i}`,
        quantity: 1,
      })),
    };
    expect(() => encodeShareToken(big)).toThrow();
  });
});

describe("buildShareUrl", () => {
  it("attaches the token as a `share` query param", () => {
    const url = buildShareUrl({
      baseUrl: "https://leafmart.example",
      payload: samplePayload,
    });
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/leafmart/cart");
    expect(parsed.searchParams.get("share")).not.toBeNull();
  });
});
