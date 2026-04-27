import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { generateMipsReport, toQppRows } from "@/lib/domain/mips";

// ---------------------------------------------------------------------------
// MIPS Quality Report API (EMR-042)
// ---------------------------------------------------------------------------
// Generates a MIPS report for the operator's organization over a given
// period. Two output modes:
//
//   GET  /api/reports/mips?periodStart=2026-01-01&periodEnd=2026-12-31
//        → returns the full structured report (denominators, numerators,
//          performance rates, exceptions per measure)
//
//   GET  /api/reports/mips?format=qpp&periodStart=...&periodEnd=...
//        → returns a flat list of QPP-style rows for handoff to a
//          submission tool. (CMS QPP submission JSON varies by year and
//          requires CMS credentials — this is the operator-facing
//          intermediate.)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!user.organizationId) {
    return NextResponse.json(
      { error: "Organization scope required" },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";

  // Default to the current calendar year if no period given (MIPS is annual).
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

  const periodStartStr = url.searchParams.get("periodStart");
  const periodEndStr = url.searchParams.get("periodEnd");

  const periodStart = periodStartStr ? new Date(periodStartStr) : yearStart;
  const periodEnd = periodEndStr ? new Date(periodEndStr) : yearEnd;

  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    return NextResponse.json(
      { error: "Invalid periodStart or periodEnd" },
      { status: 400 },
    );
  }

  const report = await generateMipsReport({
    organizationId: user.organizationId,
    periodStart,
    periodEnd,
  });

  if (format === "qpp") {
    return NextResponse.json(
      {
        organizationId: report.organizationId,
        periodStart: report.periodStart.toISOString().slice(0, 10),
        periodEnd: report.periodEnd.toISOString().slice(0, 10),
        rows: toQppRows(report),
      },
      {
        headers: {
          "Content-Disposition": `attachment; filename="mips-qpp-${user.organizationId}-${periodStart.toISOString().slice(0, 10)}.json"`,
        },
      },
    );
  }

  return NextResponse.json(report);
}
