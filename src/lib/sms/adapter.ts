// SMS adapter for transactional messages (appointment reminders, etc).
//
// In production, the Twilio REST API is used. When the Twilio env vars
// are absent (local dev, CI, tests), a deterministic in-memory mock
// adapter is used instead — the mock records every send so tests and
// dev tooling can inspect what would have gone out.

import { logger } from "@/lib/observability/log";

export interface SmsSendInput {
  to: string;
  body: string;
  /** Free-form metadata for logging / audit / idempotency keys. */
  context?: Record<string, unknown>;
}

export interface SmsSendResult {
  ok: boolean;
  /** Provider-issued message id when available. */
  messageId?: string;
  /** Human-readable error if `ok=false`. */
  error?: string;
  /** Tag identifying which adapter handled the send (twilio | mock). */
  adapter: "twilio" | "mock";
}

export interface SmsAdapter {
  readonly kind: "twilio" | "mock";
  send(input: SmsSendInput): Promise<SmsSendResult>;
}

// ---------------------------------------------------------------------------
// Phone normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a US-style phone number to E.164 (+1XXXXXXXXXX). Returns null
 * for inputs that can't be coerced — callers should treat null as "do not
 * send" rather than try to send a malformed value.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    return digits.length >= 8 ? digits : null;
  }
  const onlyDigits = digits.replace(/\D/g, "");
  if (onlyDigits.length === 10) return `+1${onlyDigits}`;
  if (onlyDigits.length === 11 && onlyDigits.startsWith("1")) {
    return `+${onlyDigits}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Mock adapter (in-process, used by tests + dev)
// ---------------------------------------------------------------------------

interface MockRecord extends SmsSendInput {
  sentAt: Date;
  messageId: string;
}

class MockSmsAdapter implements SmsAdapter {
  readonly kind = "mock" as const;
  private sent: MockRecord[] = [];
  private counter = 0;

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    const to = normalizePhone(input.to);
    if (!to) {
      return { ok: false, error: "Invalid phone number.", adapter: "mock" };
    }
    if (!input.body || input.body.trim().length === 0) {
      return { ok: false, error: "Empty message body.", adapter: "mock" };
    }
    this.counter += 1;
    const messageId = `mock_${Date.now()}_${this.counter}`;
    this.sent.push({
      to,
      body: input.body,
      context: input.context,
      sentAt: new Date(),
      messageId,
    });
    logger.info({
      event: "sms.mock.sent",
      to,
      messageId,
      bodyPreview: input.body.slice(0, 60),
      context: input.context,
    });
    return { ok: true, messageId, adapter: "mock" };
  }

  /** Test helper: every send the mock has captured, in order. */
  getSent(): MockRecord[] {
    return [...this.sent];
  }

  /** Test helper: clear captured sends between tests. */
  reset(): void {
    this.sent = [];
    this.counter = 0;
  }
}

// One process-wide instance so tests can inspect what was sent across
// multiple call sites.
const MOCK_SINGLETON = new MockSmsAdapter();

/** Exposed for tests; not for production code paths. */
export function getMockSmsAdapter(): MockSmsAdapter {
  return MOCK_SINGLETON;
}

// ---------------------------------------------------------------------------
// Twilio adapter (REST API; no SDK dependency)
// ---------------------------------------------------------------------------

class TwilioSmsAdapter implements SmsAdapter {
  readonly kind = "twilio" as const;
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly fromNumber: string,
  ) {}

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    const to = normalizePhone(input.to);
    if (!to) {
      return { ok: false, error: "Invalid phone number.", adapter: "twilio" };
    }
    if (!input.body || input.body.trim().length === 0) {
      return { ok: false, error: "Empty message body.", adapter: "twilio" };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
    const body = new URLSearchParams({
      To: to,
      From: this.fromNumber,
      Body: input.body,
    });

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      const json = (await res.json()) as { sid?: string; message?: string };
      if (!res.ok) {
        logger.error({
          event: "sms.twilio.failed",
          to,
          status: res.status,
          error: json.message,
        });
        return {
          ok: false,
          error: json.message ?? `HTTP ${res.status}`,
          adapter: "twilio",
        };
      }
      logger.info({
        event: "sms.twilio.sent",
        to,
        messageId: json.sid,
        context: input.context,
      });
      return { ok: true, messageId: json.sid, adapter: "twilio" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ event: "sms.twilio.exception", to, error: msg });
      return { ok: false, error: msg, adapter: "twilio" };
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Return the active SMS adapter. Picks Twilio when all three env vars are
 * present (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER);
 * falls back to the mock otherwise.
 *
 * The factory is intentionally not cached — env vars can change between
 * test cases that mutate process.env.
 */
export function getSmsAdapter(): SmsAdapter {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (sid && token && from) {
    return new TwilioSmsAdapter(sid, token, from);
  }
  return MOCK_SINGLETON;
}
