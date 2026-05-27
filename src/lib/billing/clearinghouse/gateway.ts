// EMR-217 — Clearinghouse gateway adapter framework
// --------------------------------------------------
// One adapter interface, three concrete implementations (Availity-shaped,
// Waystar-shaped, Change Healthcare-shaped — collapsed into one default
// HTTPS adapter for V1) plus a SFTP adapter for the gateways that still
// require it. Auth, rate-limiting, exponential backoff with jitter, and
// dead-letter routing are factored into helpers so each adapter only
// implements the actual wire calls.
//
// Secrets come from env via `getGatewayConfig()` — never from the DB
// or constants in code.

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

export type GatewayName = "availity" | "waystar" | "change_healthcare" | "office_ally" | "simulated";

export interface SubmitClaimRequest {
  /** EDI 837P payload as built by build837P(). */
  ediPayload: string;
  /** Optional client-side correlation id. The gateway echoes it on the
   *  response so we can match async responses back to the right
   *  ClearinghouseSubmission row. */
  correlationId: string;
}

export interface SubmitClaimResponse {
  /** Gateway-assigned tracking id used to poll for 277CA / 835. */
  gatewayTrackingId: string;
  /** Synchronous accept / reject when the gateway returns one immediately. */
  syncStatus: "accepted" | "rejected" | "pending";
  /** Response body for audit storage. */
  rawResponse: string;
  /** Parsed rejection metadata when syncStatus = "rejected". */
  rejection?: {
    code: string;
    message: string;
  };
}

export interface PollResponse {
  /** New 277CA / 835 / 999 documents available since the last poll. */
  documents: Array<{
    type: "277CA" | "835" | "999";
    correlationId: string | null;
    body: string;
  }>;
  /** Cursor to pass to the next poll() call. Opaque per gateway. */
  nextCursor: string | null;
}

export interface ClearinghouseAdapter {
  readonly name: GatewayName;
  submit(req: SubmitClaimRequest): Promise<SubmitClaimResponse>;
  poll(cursor: string | null): Promise<PollResponse>;
}

// ---------------------------------------------------------------------------
// Auth: OAuth2 client-credentials with token refresh on 401
// ---------------------------------------------------------------------------

export interface OAuth2Config {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
}

export interface OAuth2Token {
  accessToken: string;
  /** Epoch ms expiry. We refresh 60s early. */
  expiresAt: number;
}

const tokenCache = new Map<string, OAuth2Token>();

/** Fetch + cache an OAuth2 access token. Refresh proactively 60s before
 *  expiry. Caller passes a `fetcher` function so tests can stub. */
export async function getOAuth2Token(
  cfg: OAuth2Config,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<OAuth2Token> {
  const cacheKey = cfg.clientId + "@" + cfg.tokenUrl;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > now() + 60_000) return cached;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  if (cfg.scope) body.set("scope", cfg.scope);

  const res = await fetcher(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new GatewayAuthError(
      `OAuth2 token fetch failed: ${res.status} ${await res.text().catch(() => "")}`,
    );
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  const token: OAuth2Token = {
    accessToken: json.access_token,
    expiresAt: now() + json.expires_in * 1000,
  };
  tokenCache.set(cacheKey, token);
  return token;
}

export class GatewayAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GatewayAuthError";
  }
}

// ---------------------------------------------------------------------------
// Rate limiting: token bucket + retry-after honoring
// ---------------------------------------------------------------------------

export interface TokenBucketState {
  tokens: number;
  lastRefillMs: number;
}

export interface TokenBucketConfig {
  capacity: number;
  refillPerSec: number;
}

/** Pure: returns the new bucket state after attempting to consume `cost`
 *  tokens at `nowMs`. When `granted` is false, `waitMs` tells the caller
 *  how long to sleep before retrying. */
export function consumeTokenBucket(
  state: TokenBucketState,
  cfg: TokenBucketConfig,
  cost: number,
  nowMs: number,
): { state: TokenBucketState; granted: boolean; waitMs: number } {
  const elapsed = Math.max(0, nowMs - state.lastRefillMs);
  const refill = (elapsed / 1000) * cfg.refillPerSec;
  const refilled = Math.min(cfg.capacity, state.tokens + refill);
  if (refilled >= cost) {
    return {
      state: { tokens: refilled - cost, lastRefillMs: nowMs },
      granted: true,
      waitMs: 0,
    };
  }
  const deficit = cost - refilled;
  const waitMs = Math.ceil((deficit / cfg.refillPerSec) * 1000);
  return {
    state: { tokens: refilled, lastRefillMs: nowMs },
    granted: false,
    waitMs,
  };
}

const buckets = new Map<GatewayName, TokenBucketState>();
const DEFAULT_BUCKET: TokenBucketConfig = { capacity: 30, refillPerSec: 5 };

export async function rateLimitedAcquire(
  gateway: GatewayName,
  cfg: TokenBucketConfig = DEFAULT_BUCKET,
  sleeper: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<void> {
  const state = buckets.get(gateway) ?? { tokens: cfg.capacity, lastRefillMs: Date.now() };
  const { state: next, granted, waitMs } = consumeTokenBucket(state, cfg, 1, Date.now());
  buckets.set(gateway, next);
  if (granted) return;
  await sleeper(waitMs);
  return rateLimitedAcquire(gateway, cfg, sleeper);
}

// ---------------------------------------------------------------------------
// Backoff: exponential with full jitter
// ---------------------------------------------------------------------------
// AWS architecture-blog "full jitter" formula:
//   sleep = random_between(0, min(cap, base * 2^attempt))

export function backoffWithJitter(args: {
  attempt: number; // 0-indexed
  baseMs?: number;
  capMs?: number;
  random?: () => number;
}): number {
  const base = args.baseMs ?? 500;
  const cap = args.capMs ?? 60_000;
  const exp = Math.min(cap, base * Math.pow(2, args.attempt));
  return Math.floor((args.random ?? Math.random)() * exp);
}

// ---------------------------------------------------------------------------
// Retry loop: 5 attempts, exponential backoff with jitter, refresh on 401
// ---------------------------------------------------------------------------

export type RetryableHttpResponse = {
  ok: boolean;
  status: number;
  body: string;
};

export interface RetryConfig {
  maxAttempts: number;
  baseMs: number;
  capMs: number;
  sleeper?: (ms: number) => Promise<void>;
  random?: () => number;
}

const DEFAULT_RETRY: RetryConfig = { maxAttempts: 5, baseMs: 500, capMs: 60_000 };

/** Run a request with retry semantics. Returns the final response or throws. */
export async function runWithRetry(
  request: () => Promise<RetryableHttpResponse>,
  onAuthRefresh: () => Promise<void>,
  cfg: RetryConfig = DEFAULT_RETRY,
): Promise<RetryableHttpResponse> {
  const sleeper = cfg.sleeper ?? ((ms) => new Promise((r) => setTimeout(r, ms)));

  let lastResponse: RetryableHttpResponse | null = null;
  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    const res = await request();
    lastResponse = res;
    if (res.ok) return res;

    if (res.status === 401) {
      await onAuthRefresh();
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      await sleeper(backoffWithJitter({ attempt, baseMs: cfg.baseMs, capMs: cfg.capMs, random: cfg.random }));
      continue;
    }
    // 4xx other than 401/429 — don't retry
    return res;
  }
  return lastResponse!;
}

// ---------------------------------------------------------------------------
// HTTPS adapter (default — works for Availity / Waystar / Change Healthcare
// REST gateways with one config swap)
// ---------------------------------------------------------------------------

export interface HttpsGatewayConfig {
  name: GatewayName;
  baseUrl: string;
  oauth: OAuth2Config;
  /** Endpoint paths relative to baseUrl. */
  paths: {
    submit: string;
    poll: string;
  };
  /** Per-gateway rate limit override. Defaults to DEFAULT_BUCKET. */
  rateLimit?: TokenBucketConfig;
  /** Test seam. */
  fetcher?: typeof fetch;
}

export class HttpsClearinghouseAdapter implements ClearinghouseAdapter {
  readonly name: GatewayName;
  private cfg: HttpsGatewayConfig;
  private fetcher: typeof fetch;

  constructor(cfg: HttpsGatewayConfig) {
    this.name = cfg.name;
    this.cfg = cfg;
    this.fetcher = cfg.fetcher ?? fetch;
  }

  async submit(req: SubmitClaimRequest): Promise<SubmitClaimResponse> {
    await rateLimitedAcquire(this.name, this.cfg.rateLimit);
    const token = await getOAuth2Token(this.cfg.oauth, this.fetcher);

    const result = await runWithRetry(
      async () => {
        const res = await this.fetcher(this.cfg.baseUrl + this.cfg.paths.submit, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "Content-Type": "application/edi-x12",
            "X-Correlation-Id": req.correlationId,
          },
          body: req.ediPayload,
        });
        return { ok: res.ok, status: res.status, body: await res.text() };
      },
      async () => {
        await getOAuth2Token(this.cfg.oauth, this.fetcher);
      },
    );

    if (!result.ok) {
      return {
        gatewayTrackingId: "",
        syncStatus: "rejected",
        rawResponse: result.body,
        rejection: {
          code: `HTTP_${result.status}`,
          message: result.body.slice(0, 500),
        },
      };
    }

    let parsed: { trackingId?: string; status?: string } = {};
    try {
      parsed = JSON.parse(result.body);
    } catch {
      // Probably an inline 999/277CA — treat as pending and rely on poll().
    }
    return {
      gatewayTrackingId: parsed.trackingId ?? req.correlationId,
      syncStatus: parsed.status === "accepted" ? "accepted" : parsed.status === "rejected" ? "rejected" : "pending",
      rawResponse: result.body,
    };
  }

  async poll(cursor: string | null): Promise<PollResponse> {
    await rateLimitedAcquire(this.name, this.cfg.rateLimit);
    const token = await getOAuth2Token(this.cfg.oauth, this.fetcher);
    const url = new URL(this.cfg.baseUrl + this.cfg.paths.poll);
    if (cursor) url.searchParams.set("cursor", cursor);

    const result = await runWithRetry(
      async () => {
        const res = await this.fetcher(url.toString(), {
          headers: { Authorization: `Bearer ${token.accessToken}` },
        });
        return { ok: res.ok, status: res.status, body: await res.text() };
      },
      async () => {
        await getOAuth2Token(this.cfg.oauth, this.fetcher);
      },
    );

    if (!result.ok) return { documents: [], nextCursor: cursor };

    try {
      const json = JSON.parse(result.body) as {
        documents?: Array<{ type: string; correlationId?: string | null; body: string }>;
        nextCursor?: string | null;
      };
      return {
        documents: (json.documents ?? [])
          .filter((d) => d.type === "277CA" || d.type === "835" || d.type === "999")
          .map((d) => ({ type: d.type as "277CA" | "835" | "999", correlationId: d.correlationId ?? null, body: d.body })),
        nextCursor: json.nextCursor ?? null,
      };
    } catch {
      return { documents: [], nextCursor: cursor };
    }
  }
}

// ---------------------------------------------------------------------------
// Simulated adapter (default for dev/test, mirrors prior agent behavior)
// ---------------------------------------------------------------------------

export class SimulatedClearinghouseAdapter implements ClearinghouseAdapter {
  readonly name: GatewayName = "simulated";

  async submit(req: SubmitClaimRequest): Promise<SubmitClaimResponse> {
    return {
      gatewayTrackingId: req.correlationId,
      syncStatus: "accepted",
      rawResponse: JSON.stringify({ status: "accepted", trackingId: req.correlationId }),
    };
  }
  async poll(cursor: string | null): Promise<PollResponse> {
    return { documents: [], nextCursor: cursor };
  }
}

// ---------------------------------------------------------------------------
// Config loader: env → adapter
// ---------------------------------------------------------------------------

export function getGatewayConfig(env: NodeJS.ProcessEnv = process.env): HttpsGatewayConfig | null {
  const name = (env.CLEARINGHOUSE_NAME ?? "").toLowerCase() as GatewayName;
  if (!name || name === "simulated") return null;
  const baseUrl = env.CLEARINGHOUSE_BASE_URL;
  const tokenUrl = env.CLEARINGHOUSE_TOKEN_URL;
  const clientId = env.CLEARINGHOUSE_CLIENT_ID;
  const clientSecret = env.CLEARINGHOUSE_CLIENT_SECRET;
  if (!baseUrl || !tokenUrl || !clientId || !clientSecret) return null;
  return {
    name,
    baseUrl,
    oauth: {
      tokenUrl,
      clientId,
      clientSecret,
      scope: env.CLEARINGHOUSE_OAUTH_SCOPE ?? "claims.submit claims.read",
    },
    paths: {
      submit: env.CLEARINGHOUSE_SUBMIT_PATH ?? "/v1/claims/837p",
      poll: env.CLEARINGHOUSE_POLL_PATH ?? "/v1/claims/responses",
    },
  };
}

export function getDefaultAdapter(env: NodeJS.ProcessEnv = process.env): ClearinghouseAdapter {
  const cfg = getGatewayConfig(env);
  if (!cfg) return new SimulatedClearinghouseAdapter();
  return new HttpsClearinghouseAdapter(cfg);
}

// ---------------------------------------------------------------------------
// SFTP adapter (Office Ally + a few legacy gateways still require it)
// ---------------------------------------------------------------------------
// We deliberately do NOT pull `ssh2-sftp-client` directly. The adapter
// accepts a small `SftpClient` interface so the worker layer can wire in
// a real client (or a mock) without dragging the dep into this package.

export interface SftpClient {
  connect(): Promise<void>;
  put(buf: Buffer, remotePath: string): Promise<void>;
  list(remotePath: string): Promise<Array<{ name: string; modifyTime: number }>>;
  get(remotePath: string): Promise<Buffer>;
  delete(remotePath: string): Promise<void>;
  end(): Promise<void>;
}

export interface SftpGatewayConfig {
  name: GatewayName;
  /** Inbound directory for our 837P uploads (gateway pulls from here). */
  outboundDir: string;
  /** Directory the gateway drops 277CA / 835 / 999 responses into. */
  inboundDir: string;
  /** Base name used for uploaded files. Tracking id is appended. */
  filePrefix: string;
  /** Factory that returns a fresh client per call — connect/disconnect is
   *  per-operation, not pooled, to match the way the gateways size their
   *  inbox SFTP servers. */
  client: () => SftpClient;
}

export class SftpClearinghouseAdapter implements ClearinghouseAdapter {
  readonly name: GatewayName;
  private cfg: SftpGatewayConfig;
  /** Track which inbound files we've already returned so poll() is idempotent. */
  private seenInbound = new Set<string>();

  constructor(cfg: SftpGatewayConfig) {
    this.name = cfg.name;
    this.cfg = cfg;
  }

  async submit(req: SubmitClaimRequest): Promise<SubmitClaimResponse> {
    await rateLimitedAcquire(this.name);
    const client = this.cfg.client();
    const remotePath = `${this.cfg.outboundDir.replace(/\/$/, "")}/${this.cfg.filePrefix}-${req.correlationId}.edi`;
    try {
      await client.connect();
      await client.put(Buffer.from(req.ediPayload, "utf8"), remotePath);
      return {
        gatewayTrackingId: req.correlationId,
        syncStatus: "pending",
        rawResponse: `SFTP upload accepted at ${remotePath}`,
      };
    } finally {
      await client.end().catch(() => {});
    }
  }

  async poll(cursor: string | null): Promise<PollResponse> {
    await rateLimitedAcquire(this.name);
    const client = this.cfg.client();
    const sinceMs = cursor ? Number(cursor) || 0 : 0;
    let latestSeen = sinceMs;
    const documents: PollResponse["documents"] = [];
    try {
      await client.connect();
      const entries = await client.list(this.cfg.inboundDir);
      for (const e of entries) {
        if (e.modifyTime <= sinceMs) continue;
        if (this.seenInbound.has(e.name)) continue;
        const remotePath = `${this.cfg.inboundDir.replace(/\/$/, "")}/${e.name}`;
        const buf = await client.get(remotePath);
        const body = buf.toString("utf8");
        const type = classifyInboundFile(e.name, body);
        if (!type) continue;
        documents.push({ type, body, correlationId: extractCorrelationId(body) });
        this.seenInbound.add(e.name);
        if (e.modifyTime > latestSeen) latestSeen = e.modifyTime;
      }
    } finally {
      await client.end().catch(() => {});
    }
    return {
      documents,
      nextCursor: latestSeen > sinceMs ? String(latestSeen) : cursor,
    };
  }
}

function classifyInboundFile(name: string, body: string): "277CA" | "835" | "999" | null {
  const n = name.toLowerCase();
  if (n.includes("277") || body.includes("ST*277")) return "277CA";
  if (n.includes("835") || body.includes("ST*835")) return "835";
  if (n.includes("999") || body.includes("ST*999")) return "999";
  return null;
}

function extractCorrelationId(body: string): string | null {
  // BHT03 (the patient control number we send) is echoed back on a 277CA;
  // for 835 we'd match by check number which the parser handles separately.
  const m = body.match(/BHT\*[^*]*\*[^*]*\*([^*~]+)/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Concrete gateway-config factories
// ---------------------------------------------------------------------------
// One config per supported gateway so callers don't have to remember which
// path Availity uses vs Waystar. All read from env so secrets never live
// in code or the DB.

type EnvLike = Record<string, string | undefined>;

export function availityHttpsConfig(env: EnvLike = process.env): HttpsGatewayConfig | null {
  const clientId = env.AVAILITY_CLIENT_ID;
  const clientSecret = env.AVAILITY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return {
    name: "availity",
    baseUrl: env.AVAILITY_BASE_URL ?? "https://api.availity.com",
    oauth: {
      tokenUrl: env.AVAILITY_TOKEN_URL ?? "https://api.availity.com/v1/token",
      clientId,
      clientSecret,
      scope: env.AVAILITY_OAUTH_SCOPE ?? "hipaa",
    },
    paths: {
      submit: env.AVAILITY_SUBMIT_PATH ?? "/availity/v1/coverages/submissions",
      poll: env.AVAILITY_POLL_PATH ?? "/availity/v1/coverages/responses",
    },
  };
}

export function waystarHttpsConfig(env: EnvLike = process.env): HttpsGatewayConfig | null {
  const clientId = env.WAYSTAR_CLIENT_ID;
  const clientSecret = env.WAYSTAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return {
    name: "waystar",
    baseUrl: env.WAYSTAR_BASE_URL ?? "https://api.waystar.com",
    oauth: {
      tokenUrl: env.WAYSTAR_TOKEN_URL ?? "https://api.waystar.com/oauth/token",
      clientId,
      clientSecret,
      scope: env.WAYSTAR_OAUTH_SCOPE ?? "claims:write claims:read",
    },
    paths: {
      submit: env.WAYSTAR_SUBMIT_PATH ?? "/v2/claims/professional",
      poll: env.WAYSTAR_POLL_PATH ?? "/v2/claims/responses",
    },
  };
}

export function changeHealthcareHttpsConfig(env: EnvLike = process.env): HttpsGatewayConfig | null {
  const clientId = env.CHANGE_HEALTHCARE_CLIENT_ID;
  const clientSecret = env.CHANGE_HEALTHCARE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return {
    name: "change_healthcare",
    baseUrl: env.CHANGE_HEALTHCARE_BASE_URL ?? "https://apis.changehealthcare.com",
    oauth: {
      tokenUrl: env.CHANGE_HEALTHCARE_TOKEN_URL ?? "https://apis.changehealthcare.com/apip/v1/oauth/token",
      clientId,
      clientSecret,
      scope: env.CHANGE_HEALTHCARE_OAUTH_SCOPE,
    },
    paths: {
      submit: env.CHANGE_HEALTHCARE_SUBMIT_PATH ?? "/medicalnetwork/professionalclaims/v3/submission",
      poll: env.CHANGE_HEALTHCARE_POLL_PATH ?? "/medicalnetwork/professionalclaims/v3/responses",
    },
  };
}

export function officeAllySftpConfig(env: EnvLike = process.env, clientFactory: () => SftpClient): SftpGatewayConfig | null {
  if (!env.OFFICE_ALLY_SFTP_HOST || !env.OFFICE_ALLY_SFTP_USER) return null;
  return {
    name: "office_ally",
    outboundDir: env.OFFICE_ALLY_OUTBOUND_DIR ?? "/inbound",
    inboundDir: env.OFFICE_ALLY_INBOUND_DIR ?? "/outbound",
    filePrefix: env.OFFICE_ALLY_FILE_PREFIX ?? "GP",
    client: clientFactory,
  };
}

// ---------------------------------------------------------------------------
// Failure classification + dead-letter helper
// ---------------------------------------------------------------------------

export type FailureCategory =
  | "network"
  | "timeout"
  | "malformed_response"
  | "auth"
  | "rate_limit_exhausted"
  | "permanent_rejection";

/** Pure: classify a thrown error or non-OK response into a stable category
 *  for dead-letter routing + metrics. */
export function classifyFailure(input: {
  err?: unknown;
  status?: number;
  attempts?: number;
  maxAttempts?: number;
}): FailureCategory {
  if (input.err instanceof GatewayAuthError) return "auth";
  if (input.err instanceof Error) {
    const m = input.err.message.toLowerCase();
    if (m.includes("timeout") || m.includes("etimedout")) return "timeout";
    if (m.includes("network") || m.includes("econnreset") || m.includes("enotfound")) return "network";
    if (m.includes("malformed") || m.includes("unexpected token")) return "malformed_response";
  }
  if (input.status === 401 || input.status === 403) return "auth";
  if (input.status === 429) return "rate_limit_exhausted";
  if (input.status && input.status >= 400 && input.status < 500) return "permanent_rejection";
  if (input.attempts != null && input.maxAttempts != null && input.attempts >= input.maxAttempts) {
    return "rate_limit_exhausted";
  }
  return "network";
}
