// EMR-310 — Share-cart token helpers.
//
// Powers the "Share" module on checkout. The share link encodes the
// cart contents (slug + quantity) into an opaque, URL-safe token so a
// recipient hitting the link gets a pre-loaded cart on Leafmart.
//
// Tokens are HMAC-signed so a tampered cart can't impersonate a real
// share. The HMAC secret comes from `LEAFMART_SHARE_SECRET`; in dev we
// fall back to a stable string so links work without env wiring.

import { createHmac, timingSafeEqual } from "crypto";

const DEV_SECRET = "leafmart-share-dev-secret";

export interface ShareableCartItem {
  slug: string;
  quantity: number;
}

export interface SharePayload {
  /** ISO date the share was created. */
  iat: string;
  items: ShareableCartItem[];
  /** Optional first-name / display name of the sender. */
  from?: string;
}

function getSecret(): string {
  return process.env.LEAFMART_SHARE_SECRET ?? DEV_SECRET;
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Buffer {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    str.length + ((4 - (str.length % 4)) % 4),
    "=",
  );
  return Buffer.from(padded, "base64");
}

function sign(body: string): string {
  return createHmac("sha256", getSecret()).update(body).digest("hex");
}

/**
 * Encode a payload into a URL-safe `body.signature` token.
 * Tokens are bounded to ~1KB; we cap at 25 items so a malicious sender
 * can't blow up downstream parsers via a giant cart.
 */
export function encodeShareToken(payload: SharePayload): string {
  if (payload.items.length > 25) {
    throw new Error("share_token_too_large");
  }
  const body = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = sign(body);
  return `${body}.${sig}`;
}

/**
 * Decode + verify a token. Returns null on any signature mismatch or
 * malformed input — callers should treat null as "show the empty
 * cart, ignore the share link" rather than surfacing an error to the
 * recipient (the goal is a friendly recovery, not a 500).
 */
export function decodeShareToken(token: string): SharePayload | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  if (
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))
  ) {
    return null;
  }

  try {
    const json = base64UrlDecode(body).toString("utf8");
    const parsed = JSON.parse(json) as SharePayload;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    if (parsed.items.some((i) => typeof i.slug !== "string" || typeof i.quantity !== "number")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildShareUrl(opts: {
  baseUrl: string;
  payload: SharePayload;
}): string {
  const token = encodeShareToken(opts.payload);
  const url = new URL("/leafmart/cart", opts.baseUrl);
  url.searchParams.set("share", token);
  return url.toString();
}
