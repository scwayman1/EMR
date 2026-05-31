// Structured logger — single entry point for app logging.
//
// Why this exists: tonight's audit found 136 direct `console.*` calls
// in src/. Each one drifts independently — no consistent fields, no
// consistent severity mapping, no single place to wire Sentry. This
// module is the abstraction that makes the larger sweep mechanical.
//
// Design constraints:
//   - No new runtime dependencies. pino lands in EPIC 4.1 as a
//     follow-up; this module is the interface that swap will be
//     drop-in for. The body is just console.* with structured
//     enrichment for now.
//   - Node-safe — works in Next.js server components, API routes,
//     AND standalone Node workers/schedulers (tsx-executed). No
//     server-only guard; import safety is enforced via ESLint rules
//     on the client component boundary instead.
//   - PHI-aware — `redact` strips known sensitive keys before
//     emission. Add to REDACT_KEYS as new sensitive fields land.
//
// Usage:
//   import { logger } from "@/lib/observability/log";
//   logger.info({ event: "auth.bootstrap.granted", userId, email });
//   logger.error({ event: "audit.persist_failed", err });
//
// Bound logger for a request scope:
//   const log = logger.with({ requestId, route: "api/admin/super-admins" });
//   log.warn({ event: "rate_limit.hit", actor: user.id });

type Level = "debug" | "info" | "warn" | "error";

const REDACT_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "apikey",
  "secret",
  "ssn",
  "dea",
  "npi",
  "authorization",
  "cookie",
  "set-cookie",
  "creditcard",
  "cvv",
]);

function redact(value: unknown, depth = 0): unknown {
  // Recursion limit — no shape we log should be deeper than this.
  if (depth > 6) return "[redacted: depth]";

  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth + 1));
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (REDACT_KEYS.has(k.toLowerCase())) {
      out[k] = "[redacted]";
    } else {
      out[k] = redact(v, depth + 1);
    }
  }
  return out;
}

function emit(level: Level, fields: Record<string, unknown>): void {
  const enriched = {
    ts: new Date().toISOString(),
    level,
    ...(redact(fields) as Record<string, unknown>),
  };

  // Single newline-delimited JSON line per emit so log aggregators
  // can parse without configuration.
  const line = JSON.stringify(enriched);

  // Severity mapping: warn/error to console.error so non-prod tooling
  // surfaces them; debug/info to console.log.
  if (level === "error" || level === "warn") {
    // eslint-disable-next-line no-console
    console.error(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

export interface Logger {
  debug(fields: Record<string, unknown>): void;
  info(fields: Record<string, unknown>): void;
  warn(fields: Record<string, unknown>): void;
  error(fields: Record<string, unknown>): void;
  /** Return a logger that prepends `bound` to every emission. */
  with(bound: Record<string, unknown>): Logger;
}

function makeLogger(bound: Record<string, unknown> = {}): Logger {
  return {
    debug: (fields) => emit("debug", { ...bound, ...fields }),
    info: (fields) => emit("info", { ...bound, ...fields }),
    warn: (fields) => emit("warn", { ...bound, ...fields }),
    error: (fields) => emit("error", { ...bound, ...fields }),
    with: (more) => makeLogger({ ...bound, ...more }),
  };
}

export const logger: Logger = makeLogger();
