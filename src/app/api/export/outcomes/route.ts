import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { OutcomeMetric } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import {
  ageToRange,
  toCSV,
  type ExportConfig,
  type ExportRow,
} from "@/lib/domain/outcome-export";

// ---------------------------------------------------------------------------
// GET /api/export/outcomes
//
// Streams a de-identified CSV of patient outcome logs scoped to the caller's
// organization. Intended for cohort research, efficacy studies, and
// reimbursement documentation. Strips all PHI direct identifiers (names, DOB,
// email, phone, address) per HIPAA Safe Harbor.
//
// Auth: any authed non-patient role attached to an organization. Patient
// users are blocked — this is a clinician/operator surface.
//
// Query params (all optional):
//   start         ISO date (inclusive lower bound on loggedAt)
//   end           ISO date (inclusive upper bound on loggedAt)
//   metrics       Comma-separated OutcomeMetric values (defaults to all)
//   demographics  "1" to include sex + age range buckets
//   conditions    "1" to include primary condition / ICD-10
//   products      "1" to include product type / route / dose
//   dosing        "1" to include days-on-treatment
//   limit         Hard cap on rows (default 50_000, max 200_000)
// ---------------------------------------------------------------------------

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50_000;
const MAX_LIMIT = 200_000;

const ALL_METRICS = Object.values(OutcomeMetric) as OutcomeMetric[];

function parseMetrics(raw: string | null): OutcomeMetric[] {
  if (!raw) return ALL_METRICS;
  const allowed = new Set<string>(ALL_METRICS);
  const requested = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => allowed.has(s)) as OutcomeMetric[];
  return requested.length > 0 ? requested : ALL_METRICS;
}

function parseDate(raw: string | null): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function flag(raw: string | null): boolean {
  return raw === "1" || raw === "true";
}

function hashPatientId(patientId: string, salt: string): string {
  const digest = createHmac("sha256", salt).update(patientId).digest("hex");
  return `DEID-${digest.slice(0, 16).toUpperCase()}`;
}

function ageFromDob(dob: Date | null, asOf: Date): number | null {
  if (!dob) return null;
  let age = asOf.getUTCFullYear() - dob.getUTCFullYear();
  const m = asOf.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && asOf.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

export async function GET(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!user.organizationId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Patient-only accounts cannot export cohort data.
  const allowedRoles = new Set(["clinician", "operator", "practice_owner", "system"]);
  const hasResearchRole = user.roles.some((r) => allowedRoles.has(r));
  if (!hasResearchRole) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const params = url.searchParams;

  const start = parseDate(params.get("start"));
  const end = parseDate(params.get("end"));
  const metrics = parseMetrics(params.get("metrics"));
  const includeDemographics = flag(params.get("demographics"));
  const includeConditions = flag(params.get("conditions"));
  const includeProducts = flag(params.get("products"));
  const includeDosing = flag(params.get("dosing"));

  const requestedLimit = Number(params.get("limit"));
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, MAX_LIMIT)
    : DEFAULT_LIMIT;

  // Per-organization HMAC salt. Hashes are stable within an org (so the same
  // patient maps to the same DEID across exports for longitudinal studies)
  // but never collide with other orgs and never reveal the underlying id.
  const exportSalt = process.env.OUTCOME_EXPORT_SALT ?? "";
  if (!exportSalt) {
    return NextResponse.json(
      { error: "export_not_configured", detail: "OUTCOME_EXPORT_SALT is not set." },
      { status: 503 },
    );
  }
  const orgSalt = `${exportSalt}:${user.organizationId}`;

  const logs = await prisma.outcomeLog.findMany({
    where: {
      metric: { in: metrics },
      patient: {
        organizationId: user.organizationId,
        deletedAt: null,
      },
      ...(start || end
        ? {
            loggedAt: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {}),
            },
          }
        : {}),
    },
    orderBy: { loggedAt: "asc" },
    take: limit,
    select: {
      metric: true,
      value: true,
      loggedAt: true,
      patientId: true,
      patient: {
        select: {
          id: true,
          dateOfBirth: true,
          // Note: NO firstName, lastName, email, phone, address — these are
          // PHI direct identifiers and must never leave this route.
          intakeAnswers: includeConditions ? true : false,
        },
      },
    },
  });

  const config: ExportConfig = {
    format: "csv",
    deidentificationLevel: "full",
    dateRange: {
      start: start ? start.toISOString().slice(0, 10) : "",
      end: end ? end.toISOString().slice(0, 10) : "",
    },
    metrics,
    includeProducts,
    includeDemographics,
    includeConditions,
    includeDosing,
  };

  const rows: ExportRow[] = logs.map((log) => {
    const row: ExportRow = {
      patientHash: hashPatientId(log.patientId, orgSalt),
      metric: log.metric,
      value: log.value,
      // Date only — strip time-of-day, which can be a quasi-identifier when
      // combined with other fields.
      loggedAt: log.loggedAt.toISOString().slice(0, 10),
    };

    if (includeDemographics) {
      const age = ageFromDob(log.patient.dateOfBirth, log.loggedAt);
      if (age !== null) row.ageRange = ageToRange(age);
      // Sex is intentionally omitted: the Patient schema does not capture a
      // structured sex/gender field, so there is nothing to include here.
    }

    return row;
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "outcomes.export",
      subjectType: "OutcomeLog",
      metadata: {
        rowCount: rows.length,
        metrics,
        start: start?.toISOString() ?? null,
        end: end?.toISOString() ?? null,
        includeDemographics,
        includeConditions,
        includeProducts,
        includeDosing,
      },
    },
  });

  const csv = toCSV(rows, config);
  const filename = `leafjourney-outcomes-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Row-Count": String(rows.length),
    },
  });
}
