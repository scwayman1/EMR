// EMR-435 — Shared helpers for /api/configs route handlers.
//
// Centralizes:
//   - JSON body parsing with structured 400 errors
//   - Auth-error → HTTP-status translation (401 / 403)
//   - Standard error response shape
//
// Auth thrown errors come from `requireImplementationAdmin` in EMR-428. That
// stub throws `Error("UNAUTHORIZED")` / `Error("FORBIDDEN")` per the codebase
// convention (see src/lib/auth/session.ts). We map those names to HTTP codes.

import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type ApiError =
  | { error: "invalid_json" }
  | { error: "invalid_input"; issues: ReturnType<ZodError["flatten"]> }
  | { error: "unauthorized" }
  | { error: "forbidden" }
  | { error: "not_found" }
  | { error: "conflict"; missing?: string[] }
  | { error: "internal_error" };

export async function readJson(req: Request): Promise<
  | { ok: true; body: unknown }
  | { ok: false; response: NextResponse }
> {
  try {
    const body = await req.json();
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "invalid_json" } satisfies ApiError, {
        status: 400,
      }),
    };
  }
}

export function invalidInput(zodError: ZodError): NextResponse {
  return NextResponse.json(
    {
      error: "invalid_input",
      issues: zodError.flatten(),
    } satisfies ApiError,
    { status: 400 },
  );
}

/**
 * Run an async block and translate the auth-stub error names into HTTP
 * responses. Anything else re-throws so the route handler / Next can surface
 * it. EMR-428's `requireImplementationAdmin` throws "UNAUTHORIZED" or
 * "FORBIDDEN" (mirroring `requireUser` / `requireRole` in session.ts).
 */
export async function withAuthErrors<T>(
  fn: () => Promise<T>,
): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" } satisfies ApiError, {
        status: 401,
      });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "forbidden" } satisfies ApiError, {
        status: 403,
      });
    }
    throw err;
  }
}

export function notFound(): NextResponse {
  return NextResponse.json({ error: "not_found" } satisfies ApiError, {
    status: 404,
  });
}

/**
 * Fields that must NEVER be set via PATCH. Mutating these is reserved for
 * publish/archive endpoints. The PATCH handler rejects payloads containing
 * any of these keys.
 */
export const PROTECTED_PATCH_FIELDS = [
  "status",
  "version",
  "publishedAt",
  "publishedBy",
] as const;

export type ProtectedPatchField = (typeof PROTECTED_PATCH_FIELDS)[number];
