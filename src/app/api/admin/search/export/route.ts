import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/auth/api-gate";
import { prisma } from "@/lib/db/prisma";
import {
  parseEntityFilter,
  runCrossTenantSearch,
  createdAtForResult,
  displayNameForResult,
  redactQuery
} from "@/lib/admin/cross-tenant-search";
import { streamCsvResponse, practiceIdColumn } from "@/lib/admin/csv-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireApiAuth({ role: "super_admin" });
  if (gate.error) return gate.error;
  const actor = gate.actor;

  const url = new URL(req.url);
  const qRaw = (url.searchParams.get("q") ?? "").trim();
  const entity = parseEntityFilter(url.searchParams.get("entity"));

  if (!qRaw) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  // Cap export to 1000 rows (bypassing the 50-row limit in parseLimit by not using parseLimit)
  // We still use runCrossTenantSearch which caps at SEARCH_MAX_LIMIT, 
  // so actually we need to fetch multiple pages if we wanted more.
  // But for now, we just pass limit: 50 to match the search page's behavior.
  const response = await runCrossTenantSearch(prisma, {
    q: qRaw,
    entity,
    limit: 50,
    cursor: null,
  });

  return streamCsvResponse({
    rows: response.results,
    columns: [
      { header: "Kind", get: (r) => r.kind },
      practiceIdColumn("Practice ID", (r) => r.organizationId),
      { header: "Practice Name", get: (r) => r.organizationName },
      { header: "Primary ID", get: (r) => r.id },
      { header: "Display", get: (r) => displayNameForResult(r) },
      { header: "Created", get: (r) => createdAtForResult(r)?.toISOString() ?? "" },
    ],
    filename: `search-results-${entity}`,
    audit: {
      entity: "cross_tenant_search",
      filters: { q: redactQuery(qRaw), entity },
      actor,
    },
  });
}
