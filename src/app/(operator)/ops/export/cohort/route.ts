// GET /ops/export/cohort — stream a de-identified research cohort CSV.
//
// Scope
//   * Org-isolated: the caller's own organizationId is the only cohort that
//     can be exported. No cross-org access, ever.
//   * RBAC: only `operator` and `practice_owner` (the roles already allowed
//     into the /ops layout and its existing export wizard). Everyone else
//     gets a 403.
//
// Query parameters (all optional)
//   condition            — substring match against condition label / ICD-10
//   cannabinoids         — comma-separated list, e.g. "THC,CBD"
//   start, end           — ISO dates bounding the outcome date range
//
// Response
//   200 + text/csv stream with Content-Disposition attachment, OR
//   401 UNAUTHORIZED if not logged in
//   403 FORBIDDEN if the role isn't operator / practice_owner
//   500 on unexpected errors

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  exportCohort,
  type CohortDataSource,
  type CohortFilter,
  type CohortPatientInput,
} from "@/lib/domain/cohort-export";
import { toCohortCsvStream } from "@/lib/domain/cohort-csv";

// Roles permitted to export research cohorts from their own practice.
// Matches the existing /ops layout contract (operator / practice_owner /
// system). `system` is omitted here intentionally — research export is a
// business action, not a platform action.
const ALLOWED_ROLES = new Set(["operator", "practice_owner"]);

/**
 * Parse the optional query-string filter. Invalid dates are dropped (we'd
 * rather export something than 400 on a hand-typed URL), malformed
 * cannabinoid lists are normalised.
 */
function parseFilter(url: URL): CohortFilter {
  const filter: CohortFilter = {};

  const condition = url.searchParams.get("condition");
  if (condition && condition.trim()) filter.condition = condition.trim();

  const cannabinoids = url.searchParams.get("cannabinoids");
  if (cannabinoids) {
    const list = cannabinoids
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (list.length) filter.cannabinoids = list;
  }

  const startRaw = url.searchParams.get("start");
  const endRaw = url.searchParams.get("end");
  if (startRaw && endRaw) {
    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      filter.dateRange = { start, end };
    }
  }
  return filter;
}

/**
 * Derive a stable per-org salt from a server-side secret and the org id.
 *
 * `COHORT_EXPORT_SALT` is the single secret; mixing in `orgId` ensures
 * pseudonyms for patient X differ across orgs (useful if the same legal
 * entity licenses multiple practices).
 *
 * Falls back to a dev-mode placeholder when the secret is unset so local
 * development isn't blocked; production deployments MUST set it.
 */
function resolveSalt(organizationId: string): string {
  const base =
    process.env.COHORT_EXPORT_SALT ||
    (process.env.NODE_ENV === "production"
      ? // In production we refuse silently-insecure defaults.
        (() => {
          throw new Error(
            "COHORT_EXPORT_SALT is required in production for research exports",
          );
        })()
      : "dev-only-cohort-salt-not-for-production");
  return createHash("sha256")
    .update(`${base}:${organizationId}`)
    .digest("hex");
}

/**
 * Prisma-backed data source. Extracts exactly the fields the domain
 * module consumes and nothing more — PII comes through only because
 * the domain contract requires it for the strip-test.
 */
function prismaDataSource(): CohortDataSource {
  return async (organizationId: string) => {
    const patients = await prisma.patient.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        id: true,
        organizationId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        postalCode: true,
        state: true,
        dateOfBirth: true,
        outcomeLogs: {
          select: { metric: true, value: true, loggedAt: true },
        },
        dosingRegimens: {
          where: { active: true },
          select: {
            calculatedThcMgPerDay: true,
            calculatedCbdMgPerDay: true,
            product: {
              select: {
                thcConcentration: true,
                cbdConcentration: true,
                cbnConcentration: true,
                cbgConcentration: true,
                thcCbdRatio: true,
              },
            },
          },
        },
      },
    });

    const rows: CohortPatientInput[] = patients.map((p) => {
      // Cannabinoids present across any active regimen's product.
      const cannabinoidsSet = new Set<string>();
      const treatmentParts: string[] = [];
      for (const r of p.dosingRegimens) {
        if ((r.product?.thcConcentration ?? 0) > 0) cannabinoidsSet.add("THC");
        if ((r.product?.cbdConcentration ?? 0) > 0) cannabinoidsSet.add("CBD");
        if ((r.product?.cbnConcentration ?? 0) > 0) cannabinoidsSet.add("CBN");
        if ((r.product?.cbgConcentration ?? 0) > 0) cannabinoidsSet.add("CBG");
        if (r.calculatedThcMgPerDay) {
          treatmentParts.push(`THC ${r.calculatedThcMgPerDay}mg/day`);
        }
        if (r.calculatedCbdMgPerDay) {
          treatmentParts.push(`CBD ${r.calculatedCbdMgPerDay}mg/day`);
        }
      }

      return {
        id: p.id,
        organizationId: p.organizationId,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone,
        addressLine1: p.addressLine1,
        addressLine2: p.addressLine2,
        city: p.city,
        postalCode: p.postalCode,
        state: p.state,
        dateOfBirth: p.dateOfBirth,
        // Primary condition + icd10 aren't first-class columns on Patient —
        // leave them null for now; downstream queries will hydrate from
        // Encounter/CodingSuggestion in a follow-up.
        primaryCondition: null,
        icd10Code: null,
        treatmentSummary: treatmentParts.join(" + ") || null,
        cannabinoids: Array.from(cannabinoidsSet),
        outcomes: p.outcomeLogs.map((o) => ({
          metric: o.metric,
          value: o.value,
          loggedAt: o.loggedAt,
        })),
      };
    });

    return rows;
  };
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("UNAUTHORIZED", { status: 401 });
  }
  if (!user.organizationId) {
    return new NextResponse("FORBIDDEN", { status: 403 });
  }
  const hasRole = user.roles.some((r) => ALLOWED_ROLES.has(r as string));
  if (!hasRole) {
    return new NextResponse("FORBIDDEN", { status: 403 });
  }

  const url = new URL(req.url);
  const filter = parseFilter(url);

  const salt = resolveSalt(user.organizationId);
  const rows = await exportCohort(user.organizationId, filter, {
    dataSource: prismaDataSource(),
    salt,
  });

  const stream = toCohortCsvStream(rows);
  const filename = `cohort-export-${user.organizationId}-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      // Tell downstream proxies this is a de-identified research artifact,
      // not PHI — aids audit review without changing behaviour.
      "X-Data-Classification": "de-identified-research",
    },
  });
}
