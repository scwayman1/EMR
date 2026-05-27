/**
 * Modality API Guard — EMR-410
 *
 * Server-only helper for use at the top of route handlers that touch a
 * modality. Throws `Error("MODALITY_DISABLED:<slug>")` when the modality is
 * off for the practice; the caller's error wrapper translates that to a 403
 * JSON response (see `withModalityErrors` below).
 *
 * Usage:
 *
 *   export async function POST(req, { params }) {
 *     return withModalityErrors(async () => {
 *       await requireModalityEnabled(params.practiceId, "cannabis-medicine");
 *       // ...handler logic...
 *       return NextResponse.json({ ok: true });
 *     });
 *   }
 *
 * The convention mirrors the existing `withAuthErrors` helper in
 * src/app/api/configs/_helpers.ts so the two can compose.
 */

import "server-only";

import { NextResponse } from "next/server";

import { isModalityEnabled } from "@/lib/modality/server";
import { MODALITY_META, type ModalityId } from "@/lib/modality/registry";
import { recordModalityRejection } from "@/lib/modality/telemetry";

const ERROR_PREFIX = "MODALITY_DISABLED:";

/**
 * Throws when the modality is disabled for the practice. Resolves silently
 * when enabled. Composes with `withModalityErrors` for the JSON response.
 */
export async function requireModalityEnabled(
  practiceId: string,
  modality: ModalityId,
): Promise<void> {
  const enabled = await isModalityEnabled(practiceId, modality);
  if (!enabled) {
    throw new Error(`${ERROR_PREFIX}${modality}`);
  }
}

/**
 * Test whether an Error from `requireModalityEnabled` carries the disabled
 * marker, and which modality it referenced. Useful for callers that want to
 * customize the response shape.
 */
export function parseModalityError(
  err: unknown,
): { modality: string } | null {
  if (!(err instanceof Error)) return null;
  if (!err.message.startsWith(ERROR_PREFIX)) return null;
  return { modality: err.message.slice(ERROR_PREFIX.length) };
}

/**
 * Wrap a route handler body so that a thrown `MODALITY_DISABLED:<slug>` error
 * becomes a 403 JSON response of shape
 *   { error: "modality_disabled", modality: "<slug>" }
 *
 * Other errors re-throw — pair with `withAuthErrors` (EMR-435) when the
 * handler also runs auth.
 */
export async function withModalityErrors<T>(
  fn: () => Promise<T>,
): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (err) {
    const parsed = parseModalityError(err);
    if (parsed) {
      return NextResponse.json(
        { error: "modality_disabled", modality: parsed.modality },
        { status: 403 },
      );
    }
    throw err;
  }
}

// EMR-441 — `withModality` + `withModalityAction` + `ModalityDisabledError`
//
// Higher-level wrappers that compose `requireModalityEnabled` with the
// telemetry emit + JSON-response shape callers want. The test file
// at `src/lib/modality/__tests__/api-guard.test.ts` is the authoritative
// contract.

/** Error thrown by `withModalityAction` when the modality is disabled. */
export class ModalityDisabledError extends Error {
  readonly modality: ModalityId;
  readonly route?: string;
  readonly practiceId?: string;

  constructor(modality: ModalityId, opts?: { route?: string; practiceId?: string }) {
    const meta = MODALITY_META[modality];
    const message = meta
      ? `${meta.label} (${modality}) is disabled for this practice.`
      : `${modality} is disabled for this practice.`;
    super(message);
    this.name = "ModalityDisabledError";
    this.modality = modality;
    this.route = opts?.route;
    this.practiceId = opts?.practiceId;
  }
}

/** Shared options shape for the two wrappers below. */
interface WithModalityOptions {
  /** Resolve the practice id for the current request. Sync or async. */
  getPracticeId: () => string | Promise<string>;
  /** Optional explicit route label for telemetry; defaults to the URL pathname. */
  route?: string;
}

type RouteHandler = (
  req: Request,
  ctx: { params: Record<string, string | string[]> },
) => Promise<Response> | Response;

/**
 * Wraps a Next.js route handler so the modality check runs before the
 * handler body. When the modality is disabled the handler is bypassed
 * and a 403 JSON response is returned with `{ error, modality, message }`.
 *
 * The telemetry rejection event is recorded with the practice id, the
 * modality slug, the route (explicit or derived from the URL pathname),
 * and an ISO timestamp.
 */
export function withModality(
  modality: ModalityId,
  handler: RouteHandler,
  opts: WithModalityOptions,
): RouteHandler {
  return async (req, ctx) => {
    const practiceId = await Promise.resolve(opts.getPracticeId());
    const enabled = await isModalityEnabled(practiceId, modality);
    if (enabled) {
      return handler(req, ctx);
    }
    const route = opts.route ?? new URL(req.url).pathname;
    recordModalityRejection({
      practiceId,
      modality,
      route,
      timestamp: new Date().toISOString(),
    });
    const meta = MODALITY_META[modality];
    const message = meta
      ? `${meta.label} is not enabled for this practice.`
      : `${modality} is not enabled for this practice.`;
    return NextResponse.json(
      { error: "modality_disabled", modality, message },
      { status: 403 },
    );
  };
}

/**
 * Server-action variant. Forwards positional args to the wrapped action
 * when the modality is enabled; throws `ModalityDisabledError` otherwise.
 * Server-action callers translate the throw into whatever client-side
 * UI they prefer.
 */
export function withModalityAction<Args extends unknown[], R>(
  modality: ModalityId,
  action: (...args: Args) => R | Promise<R>,
  opts: WithModalityOptions,
): (...args: Args) => Promise<R> {
  return async (...args: Args): Promise<R> => {
    const practiceId = await Promise.resolve(opts.getPracticeId());
    const enabled = await isModalityEnabled(practiceId, modality);
    if (enabled) {
      return Promise.resolve(action(...args));
    }
    const route = opts.route ?? "action:<unknown>";
    recordModalityRejection({
      practiceId,
      modality,
      route,
      timestamp: new Date().toISOString(),
    });
    throw new ModalityDisabledError(modality, { route, practiceId });
  };
}
