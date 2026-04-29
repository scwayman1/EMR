import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/ornament";
import { getLoadStatus, quarterFromDate } from "@/lib/billing/ncci-mue";
import { refreshNcciAction, refreshMueAction } from "./actions";

export const metadata = { title: "NCCI / MUE — admin" };

// EMR-222 admin page — shows the loaded quarter for the NCCI PTP and MUE
// reference tables, and exposes manual refresh buttons that re-pull the
// CMS public-use CSVs from the configured source URL.

export default async function CodeEditsPage() {
  await requireUser();
  const status = await getLoadStatus();
  const currentQuarter = quarterFromDate(new Date());

  const isStale = (loaded: string | undefined | null) =>
    !loaded || loaded !== currentQuarter;

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Billing → admin"
        title="NCCI / MUE reference tables"
        description="CMS publishes the National Correct Coding Initiative (PTP edits) and Medically Unlikely Edits (MUE) limits each quarter. The scrub engine reads from these tables before every claim."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Eyebrow>NCCI PTP edits</Eyebrow>
            <CardTitle>
              {status.ncci ? `${status.ncci.rowCount.toLocaleString()} pairs` : "Not loaded"}
            </CardTitle>
            <CardDescription>
              Loaded quarter:{" "}
              {status.ncci ? (
                isStale(status.ncci.quarter) ? (
                  <Badge tone="warning">{status.ncci.quarter} · stale (current is {currentQuarter})</Badge>
                ) : (
                  <Badge tone="success">{status.ncci.quarter} · current</Badge>
                )
              ) : (
                <Badge tone="danger">never</Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-3">
              {status.ncci
                ? `Last refresh: ${status.ncci.loadedAt.toISOString().slice(0, 19).replace("T", " ")} UTC`
                : "Run the loader to seed the table from the CMS PTP CSV."}
            </p>
            <form action={refreshNcciAction}>
              <button
                type="submit"
                className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-medium hover:bg-surface-elevated"
              >
                Refresh from CMS
              </button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Eyebrow>MUE limits</Eyebrow>
            <CardTitle>
              {status.mue ? `${status.mue.rowCount.toLocaleString()} codes` : "Not loaded"}
            </CardTitle>
            <CardDescription>
              Loaded quarter:{" "}
              {status.mue ? (
                isStale(status.mue.quarter) ? (
                  <Badge tone="warning">{status.mue.quarter} · stale (current is {currentQuarter})</Badge>
                ) : (
                  <Badge tone="success">{status.mue.quarter} · current</Badge>
                )
              ) : (
                <Badge tone="danger">never</Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-3">
              {status.mue
                ? `Last refresh: ${status.mue.loadedAt.toISOString().slice(0, 19).replace("T", " ")} UTC`
                : "Run the loader to seed the table from the CMS MUE CSV."}
            </p>
            <form action={refreshMueAction}>
              <button
                type="submit"
                className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-medium hover:bg-surface-elevated"
              >
                Refresh from CMS
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
