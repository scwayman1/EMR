// EMR-224 — Lockbox CSV reconciliation page.
//
// Operator workflow: upload a bank statement CSV → server action parses it,
// runs the matcher against the org's recent ERAs + patient payments, and
// returns a per-deposit preview (matched / partial / unmatched / variance).
// The preview lets ops sanity-check the matcher before firing the daily-close
// worker that actually persists BankDepositMatch rows.

import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/ornament";
import { ReconcileForm } from "./ReconcileForm";

export const metadata = { title: "Lockbox reconciliation — CSV preview" };

export default async function LockboxReconcilePage() {
  const user = await requireUser();
  if (!user.organizationId) {
    return (
      <PageShell>
        <p>No organization selected.</p>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Track 7 · Financial Ops"
        title="Reconcile bank statement"
        description="Upload a CSV deposit export. We'll parse it, match every line to an ERA or patient payment, and surface variance for human review."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <Card>
          <CardHeader>
            <Eyebrow>Step 1 — upload</Eyebrow>
            <CardTitle>Bank deposit CSV</CardTitle>
            <CardDescription>
              Most banks export a flat CSV with date, amount, description, and reference columns.
              Headers are auto-detected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReconcileForm />
          </CardContent>
        </Card>

        <Card tone="raised">
          <CardHeader>
            <CardTitle className="text-sm">How matching works</CardTitle>
            <CardDescription>EMR-224 — Lockbox / bank deposit matching</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-text-muted space-y-2">
            <p><span className="text-text font-medium">Window:</span> ± 5 days from the deposit date.</p>
            <p><span className="text-text font-medium">Tolerance:</span> 2¢ for rounding noise.</p>
            <p><span className="text-text font-medium">Strategy:</span> exact single-candidate first, then largest-first greedy fill.</p>
            <p><span className="text-text font-medium">Variance:</span> matched ≠ deposit lands here for human review on daily close.</p>
            <p>
              <Link href="/ops/lockbox" className="text-accent hover:underline text-xs">
                ← back to lockbox dashboard
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
