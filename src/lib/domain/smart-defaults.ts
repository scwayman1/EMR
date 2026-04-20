/**
 * Smart defaults — per-user, per-form "last used value" persistence.
 *
 * Any form can opt into auto-populating fields with the last value the
 * user submitted for that field. Backed by localStorage so it works
 * entirely client-side (no server round trip, no prisma).
 *
 * Storage key shape:
 *   defaults:v1:<userId>:<formId>:<fieldId>
 *
 * The `v1` segment is a version prefix so we can migrate schema later
 * without having to read-or-wipe every user's existing defaults.
 *
 * These helpers are framework-free — all browser access is guarded so
 * they can be exercised by the node-only vitest suite by passing a
 * stub `Storage` implementation via the `storage` parameter.
 *
 * Values are stored JSON-serialized so non-string primitives (numbers,
 * booleans, arrays, small objects) round-trip safely. The API surface
 * reports the value as `string | null` for read convenience; callers
 * that stored non-strings can JSON.parse the return.
 */

export const STORAGE_PREFIX = "defaults:v1";

/** Opaque identifier for the current user — pass session.userId etc. */
export type UserId = string;

export interface SmartDefaultsOptions {
  /**
   * Storage backend. Defaults to `window.localStorage` when available.
   * Pass a stub in tests or for SSR-safe usage.
   */
  storage?: Storage | null;
}

function resolveStorage(opts?: SmartDefaultsOptions): Storage | null {
  if (opts && "storage" in opts) return opts.storage ?? null;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Build the canonical storage key for a given user / form / field tuple.
 * Exported for tests + for callers that need to inspect or clear keys
 * through a different path (e.g. bulk export).
 */
export function buildKey(
  userId: UserId,
  formId: string,
  fieldId: string,
): string {
  return `${STORAGE_PREFIX}:${userId}:${formId}:${fieldId}`;
}

/**
 * Persist the last value the user picked/entered for this field. Any
 * JSON-serializable value is accepted — it's serialized on the way in
 * and parsed on the way out. Undefined is treated as "no value" and
 * clears the entry.
 */
export function rememberValue(
  userId: UserId,
  formId: string,
  fieldId: string,
  value: unknown,
  opts?: SmartDefaultsOptions,
): void {
  const storage = resolveStorage(opts);
  if (!storage) return;
  const key = buildKey(userId, formId, fieldId);
  if (value === undefined) {
    try {
      storage.removeItem(key);
    } catch {
      // Storage unavailable / quota full — non-critical, silently skip.
    }
    return;
  }
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // JSON cycle / quota — silently skip; defaults are best-effort.
  }
}

/**
 * Read the last-used value for this field. Returns the raw string that
 * was persisted (JSON-encoded), or null if no value was stored or the
 * payload couldn't be decoded. Callers that want the typed value should
 * use `readLastParsed`.
 */
export function readLastValue(
  userId: UserId,
  formId: string,
  fieldId: string,
  opts?: SmartDefaultsOptions,
): string | null {
  const storage = resolveStorage(opts);
  if (!storage) return null;
  try {
    const raw = storage.getItem(buildKey(userId, formId, fieldId));
    return raw ?? null;
  } catch {
    return null;
  }
}

/**
 * Read and parse the last-used value. Returns `fallback` if the value
 * is missing or malformed. Keeps non-string persistence ergonomic.
 */
export function readLastParsed<T>(
  userId: UserId,
  formId: string,
  fieldId: string,
  fallback: T,
  opts?: SmartDefaultsOptions,
): T {
  const raw = readLastValue(userId, formId, fieldId, opts);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Remove every remembered value for a given form (all fields). Useful
 * after a schema change or when the user clicks "reset defaults".
 */
export function clearFormDefaults(
  userId: UserId,
  formId: string,
  opts?: SmartDefaultsOptions,
): number {
  const storage = resolveStorage(opts);
  if (!storage) return 0;
  const prefix = `${STORAGE_PREFIX}:${userId}:${formId}:`;
  const victims: string[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(prefix)) victims.push(key);
    }
    for (const key of victims) storage.removeItem(key);
  } catch {
    // Storage unavailable — nothing to clear.
  }
  return victims.length;
}

/**
 * Remove a single remembered field. Exposed as its own helper so the
 * React hook can wipe a value when the user explicitly clears an input.
 */
export function forgetValue(
  userId: UserId,
  formId: string,
  fieldId: string,
  opts?: SmartDefaultsOptions,
): void {
  const storage = resolveStorage(opts);
  if (!storage) return;
  try {
    storage.removeItem(buildKey(userId, formId, fieldId));
  } catch {
    // Storage unavailable — non-critical.
  }
}
