// EMR-232 — Payabli API client.
//
// Thin TypeScript wrapper around Payabli's REST API. Responsibilities:
//   * authentication header injection (`requestToken`)
//   * exponential-backoff retry on 5xx and network errors
//   * idempotency-key headers on every POST so retried requests don't
//     create duplicate charges
//   * structured error logging that *never* logs the API key
//
// We do not pin a Payabli SDK — there isn't a maintained first-party
// TS one, and the JSON shape is small enough that a hand-written
// client is cleaner than wrangling generated types.
//
// Configuration (env):
//   PAYABLI_API_KEY        — sandbox or prod token (kept out of logs)
//   PAYABLI_ENTRY_POINT    — Pay Point id, e.g., leafjourney-hemp-sandbox
//   PAYABLI_API_BASE_URL   — defaults to https://api-sandbox.payabli.com
//
// Sandbox setup is a human task (signup + Pay Point creation in the
// dashboard); see docs/marketplace/payabli-onboarding.md.

import { randomBytes } from "crypto";
import type {
  PayabliMoneyInRequest,
  PayabliMoneyInResponse,
} from "./types";

export interface PayabliClientConfig {
  apiKey: string;
  entryPoint: string;
  baseUrl: string;
  /** Override the global fetch — used by tests to inject a mock. */
  fetchImpl?: typeof fetch;
  /** Max retry attempts on retryable failures. Default 3. */
  maxRetries?: number;
  /** Base ms for exponential backoff. Default 250 (so 250 / 500 / 1000 / ...). */
  backoffBaseMs?: number;
}

export class PayabliApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "PayabliApiError";
  }
}

const DEFAULT_BASE_URL = "https://api-sandbox.payabli.com";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BACKOFF_BASE_MS = 250;

function configFromEnv(): PayabliClientConfig {
  const apiKey = process.env.PAYABLI_API_KEY;
  const entryPoint = process.env.PAYABLI_ENTRY_POINT;
  if (!apiKey) throw new Error("PAYABLI_API_KEY env var is required");
  if (!entryPoint) throw new Error("PAYABLI_ENTRY_POINT env var is required");
  return {
    apiKey,
    entryPoint,
    baseUrl: process.env.PAYABLI_API_BASE_URL ?? DEFAULT_BASE_URL,
  };
}

export function generateIdempotencyKey(): string {
  return `lj_${Date.now().toString(36)}_${randomBytes(8).toString("hex")}`;
}

/**
 * Redacted log line: caller passes the full body, we strip credentials
 * + PAN-shaped fields before emitting. Always called instead of bare
 * console.log inside this module.
 */
function logSafe(scope: string, payload: Record<string, unknown>): void {
  const safe = { ...payload };
  for (const key of Object.keys(safe)) {
    if (key === "apiKey" || key === "requestToken" || key === "cardnumber" || key === "cardcvv") {
      safe[key] = "[redacted]";
    }
  }
  // eslint-disable-next-line no-console
  console.log(`[payabli:${scope}]`, JSON.stringify(safe));
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

export class PayabliClient {
  private readonly cfg: PayabliClientConfig;
  private readonly fetch: typeof fetch;

  constructor(cfg?: Partial<PayabliClientConfig>) {
    // Always load env as a fallback — cfg fields override individually.
    // Previous code nulled env when cfg.apiKey was present, crashing on
    // partial overrides like { apiKey: "foo" } with no entryPoint.
    const env = (cfg?.apiKey && cfg?.entryPoint) ? null : configFromEnv();
    this.cfg = {
      apiKey: cfg?.apiKey ?? env!.apiKey,
      entryPoint: cfg?.entryPoint ?? env!.entryPoint,
      baseUrl: cfg?.baseUrl ?? env?.baseUrl ?? DEFAULT_BASE_URL,
      fetchImpl: cfg?.fetchImpl,
      maxRetries: cfg?.maxRetries ?? DEFAULT_MAX_RETRIES,
      backoffBaseMs: cfg?.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS,
    };
    this.fetch = this.cfg.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Authorize-and-capture a transaction (the typical e-comm flow).
   * Idempotency key is bound into the request body — the same key
   * passed twice returns the same `referenceId` per Payabli's
   * duplicate-detection contract.
   */
  async getsale(req: PayabliMoneyInRequest): Promise<PayabliMoneyInResponse> {
    return this.post<PayabliMoneyInResponse>("/api/MoneyIn/getsale", {
      ...req,
      entryPoint: this.cfg.entryPoint,
    });
  }

  /**
   * Authorize-only — funds reserved but not captured. Use when the
   * order needs human review (chargeback hardening) before capture.
   */
  async getauth(req: PayabliMoneyInRequest): Promise<PayabliMoneyInResponse> {
    return this.post<PayabliMoneyInResponse>("/api/MoneyIn/getauth", {
      ...req,
      entryPoint: this.cfg.entryPoint,
    });
  }

  /**
   * Capture a previously-authorized transaction. `referenceId` from
   * the original getauth response.
   */
  async capture(referenceId: string): Promise<PayabliMoneyInResponse> {
    return this.post<PayabliMoneyInResponse>(
      `/api/MoneyIn/capture/${encodeURIComponent(referenceId)}`,
      { entryPoint: this.cfg.entryPoint },
    );
  }

  /** Refund (partial or full). Amount in dollars; null = full refund. */
  async refund(referenceId: string, amountUsd: number | null = null): Promise<PayabliMoneyInResponse> {
    return this.post<PayabliMoneyInResponse>("/api/MoneyIn/refund", {
      entryPoint: this.cfg.entryPoint,
      referenceId,
      amount: amountUsd,
    });
  }

  /** Retrieve a transaction's current state. Read-only — no idempotency. */
  async getTransaction(referenceId: string): Promise<PayabliMoneyInResponse> {
    const url = `${this.cfg.baseUrl}/api/Query/transactions/${encodeURIComponent(referenceId)}`;
    const res = await this.fetch(url, {
      method: "GET",
      headers: this.headers({ idempotencyKey: null }),
    });
    return this.parseResponse<PayabliMoneyInResponse>(res, url);
  }

  // ────────────────────────────────────────────────────────────
  // Internals
  // ────────────────────────────────────────────────────────────

  private async post<T>(path: string, body: object): Promise<T> {
    const url = `${this.cfg.baseUrl}${path}`;
    const idempotencyKey =
      "idempotencyKey" in body && typeof body.idempotencyKey === "string"
        ? body.idempotencyKey
        : generateIdempotencyKey();

    let attempt = 0;
    let lastError: unknown = null;
    while (attempt <= (this.cfg.maxRetries ?? DEFAULT_MAX_RETRIES)) {
      try {
        const res = await this.fetch(url, {
          method: "POST",
          headers: this.headers({ idempotencyKey }),
          body: JSON.stringify(body),
        });
        return await this.parseResponse<T>(res, url);
      } catch (err) {
        lastError = err;
        if (err instanceof PayabliApiError && !err.retryable) throw err;
        if (attempt === (this.cfg.maxRetries ?? DEFAULT_MAX_RETRIES)) break;

        const backoff = (this.cfg.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS) * 2 ** attempt;
        logSafe("retry", { url, attempt, backoffMs: backoff, error: (err as Error).message });
        await sleep(backoff);
        attempt += 1;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new PayabliApiError(`Payabli ${url} failed after retries`, 0, false);
  }

  private headers(opts: { idempotencyKey: string | null }): Record<string, string> {
    const h: Record<string, string> = {
      "content-type": "application/json",
      requestToken: this.cfg.apiKey,
    };
    if (opts.idempotencyKey) {
      h["Idempotency-Key"] = opts.idempotencyKey;
    }
    return h;
  }

  private async parseResponse<T>(res: Response, url: string): Promise<T> {
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { rawBody: text };
    }
    if (!res.ok) {
      const retryable = res.status >= 500 || res.status === 429;
      logSafe("error", { url, status: res.status, body: json });
      throw new PayabliApiError(
        `Payabli ${url} returned ${res.status}`,
        res.status,
        retryable,
      );
    }
    return json as T;
  }
}
