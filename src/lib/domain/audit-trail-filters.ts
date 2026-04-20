/**
 * Pure helpers for parsing and applying URL-driven filters on the clinician
 * Audit Trail page (`/clinic/audit-trail`).
 *
 * The page is a Next.js server component, so filter state lives in the URL
 * (searchParams) instead of React state. These helpers:
 *
 *   parseAuditFilters    — zod-validated `searchParams` → typed `AuditFilters`
 *   buildPrismaWhere     — `AuditFilters` + orgId → `Prisma.AuditLogWhereInput`
 *
 * Both are framework-free so the node-only vitest suite can exercise them
 * without booting Next, Prisma, or the DOM.
 *
 * Security note: buildPrismaWhere ALWAYS pins `organizationId` to the caller's
 * org. Callers must not pass an org they don't belong to — that responsibility
 * lives in the page's `requireUser()` gate.
 */

import type { Prisma } from "@prisma/client";
import { z } from "zod";

// ─── Constants ──────────────────────────────────────────

/**
 * Actions we expose in the filter dropdown. The AuditLog.action field is free-
 * form in the schema (e.g. "patient.read", "note.finalized") so we match on
 * the semantic verb (the substring before / after the dot is not constrained).
 */
export const AUDIT_ACTIONS = ["READ", "UPDATE", "CREATE", "DELETE"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * Default page size for cursor-based pagination. Matches the "Load more" UX
 * where each click fetches the next 50 entries.
 */
export const AUDIT_PAGE_SIZE = 50;

/**
 * Map a UI action choice to the set of substrings we look for in the free-
 * form `action` column. Each verb covers the common conventions across the
 * codebase (e.g. "READ" matches "patient.read", "note.viewed", "list").
 */
const ACTION_SUBSTRINGS: Record<AuditAction, string[]> = {
  READ: ["read", "view", "list"],
  UPDATE: ["update", "write", "finalize", "sign", "edit"],
  CREATE: ["create", "add", "new"],
  DELETE: ["delete", "remove", "revoke", "destroy"],
};

// ─── Types ──────────────────────────────────────────────

export interface AuditFilters {
  actor: string | null;
  action: AuditAction | null;
  entity: string | null;
  from: Date | null;
  to: Date | null;
  q: string | null;
  cursor: string | null;
  take: number;
}

// ─── Zod Schema ─────────────────────────────────────────

/**
 * Accept a single string *or* the first entry of a repeated param. Next's
 * `searchParams` is typed as `string | string[] | undefined` per key.
 */
const stringParam = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    const raw = Array.isArray(v) ? v[0] : v;
    const trimmed = raw?.trim();
    return trimmed ? trimmed : undefined;
  });

/**
 * Parse an ISO-8601 date string. Rejects obvious garbage ("not-a-date",
 * "2026-99-99"). Returns null when absent so downstream code can short-circuit.
 */
const isoDateParam = stringParam
  .pipe(
    z
      .string()
      .optional()
      .refine(
        (v) => {
          if (v === undefined) return true;
          const d = new Date(v);
          return !Number.isNaN(d.getTime());
        },
        { message: "Invalid ISO date" },
      )
      .transform((v) => (v === undefined ? null : new Date(v))),
  );

/**
 * Take (page size). Clamped to [1, AUDIT_PAGE_SIZE] to prevent an unbounded
 * query from the URL. Falls back to AUDIT_PAGE_SIZE if missing or invalid.
 */
const takeParam = stringParam
  .transform((v) => {
    if (v === undefined) return AUDIT_PAGE_SIZE;
    const n = Number.parseInt(v, 10);
    if (!Number.isFinite(n) || n <= 0) return AUDIT_PAGE_SIZE;
    return Math.min(n, AUDIT_PAGE_SIZE);
  });

const actionParam = stringParam.pipe(
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined) return null;
      const upper = v.toUpperCase();
      return (AUDIT_ACTIONS as readonly string[]).includes(upper)
        ? (upper as AuditAction)
        : null;
    }),
);

const auditFilterSchema = z.object({
  actor: stringParam.transform((v) => v ?? null),
  action: actionParam,
  entity: stringParam.transform((v) => v ?? null),
  from: isoDateParam,
  to: isoDateParam,
  q: stringParam.transform((v) => v ?? null),
  cursor: stringParam.transform((v) => v ?? null),
  take: takeParam,
});

// ─── parseAuditFilters ─────────────────────────────────

/**
 * Validate and normalize the server component's `searchParams` into a typed
 * `AuditFilters` object. Invalid values are dropped (null/defaults) rather
 * than throwing — a typo in the URL should never 500 the page. Actual schema-
 * level violations (wrong array shapes) throw via zod.
 */
export function parseAuditFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AuditFilters {
  return auditFilterSchema.parse({
    actor: searchParams.actor,
    action: searchParams.action,
    entity: searchParams.entity,
    from: searchParams.from,
    to: searchParams.to,
    q: searchParams.q,
    cursor: searchParams.cursor,
    take: searchParams.take,
  });
}

// ─── buildPrismaWhere ──────────────────────────────────

/**
 * Translate validated filters into a Prisma `AuditLogWhereInput`. The caller
 * passes the authenticated user's `organizationId`; we pin it unconditionally
 * so there is no way for a crafted URL to leak rows from another org.
 *
 * The `q` freetext is applied across actor-agent strings, action, subject type
 * and subject id via case-insensitive `contains` — matches the existing in-
 * memory behavior of the old client component.
 */
export function buildPrismaWhere(
  filters: AuditFilters,
  organizationId: string,
): Prisma.AuditLogWhereInput {
  const AND: Prisma.AuditLogWhereInput[] = [];

  if (filters.actor) {
    AND.push({ actorUserId: filters.actor });
  }

  if (filters.action) {
    // free-form action column → OR across the semantic verbs
    const substrings = ACTION_SUBSTRINGS[filters.action];
    AND.push({
      OR: substrings.map((s) => ({
        action: { contains: s, mode: "insensitive" as const },
      })),
    });
  }

  if (filters.entity) {
    AND.push({
      subjectType: { equals: filters.entity, mode: "insensitive" as const },
    });
  }

  if (filters.from || filters.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.from) createdAt.gte = filters.from;
    if (filters.to) createdAt.lte = filters.to;
    AND.push({ createdAt });
  }

  if (filters.q) {
    AND.push({
      OR: [
        { action: { contains: filters.q, mode: "insensitive" as const } },
        { subjectType: { contains: filters.q, mode: "insensitive" as const } },
        { subjectId: { contains: filters.q, mode: "insensitive" as const } },
        { actorAgent: { contains: filters.q, mode: "insensitive" as const } },
      ],
    });
  }

  return {
    organizationId,
    ...(AND.length > 0 ? { AND } : {}),
  };
}

// ─── URL helpers ───────────────────────────────────────

/**
 * Build a `?foo=bar&baz=qux` query string from a partial filter patch, keeping
 * only the fields that have meaningful values. Used by the client filter bar
 * to route to the same page with updated URL state.
 */
export function serializeAuditFilters(
  filters: Partial<AuditFilters>,
): string {
  const params = new URLSearchParams();
  if (filters.actor) params.set("actor", filters.actor);
  if (filters.action) params.set("action", filters.action);
  if (filters.entity) params.set("entity", filters.entity);
  if (filters.from)
    params.set("from", filters.from.toISOString().slice(0, 10));
  if (filters.to) params.set("to", filters.to.toISOString().slice(0, 10));
  if (filters.q) params.set("q", filters.q);
  if (filters.cursor) params.set("cursor", filters.cursor);
  const s = params.toString();
  return s ? `?${s}` : "";
}
