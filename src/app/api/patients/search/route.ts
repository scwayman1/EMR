// EMR-646 — Universal patient search API.
//
// GET /api/patients/search?q=...&limit=...
//
// Scoped to the caller's organization — clinicians never see patients
// from other practices through this surface. Super-admins should use
// /api/admin/search for cross-tenant lookups instead.
//
// Auth: requireApiAuth() (any signed-in user). Authorization is enforced
// by scoping the Prisma where clause to the actor's organizationId; a
// caller with no org sees no results.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/auth/api-gate";
import { prisma } from "@/lib/db/prisma";
import {
  PATIENT_SEARCH_DEFAULT_LIMIT,
  PATIENT_SEARCH_MAX_LIMIT,
  searchPatients,
} from "@/lib/patient-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireApiAuth();
  if (gate.error) return gate.error;
  const actor = gate.actor;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = parseLimit(url.searchParams.get("limit"));

  // No org → no results. We don't 403 because the caller is otherwise
  // authenticated; we just have nothing scoped to show them.
  if (!actor.organizationId) {
    return NextResponse.json({ results: [] });
  }

  // Empty query short-circuit. The helper handles this too, but we
  // skip the round-trip to keep the typeahead snappy on every keystroke.
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchPatients(prisma, {
    query: q,
    limit,
    scope: { organizationId: actor.organizationId },
  });

  return NextResponse.json({ results });
}

function parseLimit(raw: string | null): number {
  if (!raw) return PATIENT_SEARCH_DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return PATIENT_SEARCH_DEFAULT_LIMIT;
  return Math.min(n, PATIENT_SEARCH_MAX_LIMIT);
}
