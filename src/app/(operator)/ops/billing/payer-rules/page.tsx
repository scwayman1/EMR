import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/ornament";
import { isStaleRule, PAYER_RULE_STALE_MS } from "@/lib/billing/payer-rules-db";
import { loadPayerRulesForOrg } from "./actions";

export const metadata = { title: "Payer rules — admin" };

// EMR-218 admin editor — shows the merged set of global + org-override
// payer rules with a staleness banner on any rule reviewed > 6 months ago.

function formatDays(n: number): string {
  return `${n}d`;
}

export default async function PayerRulesPage() {
  const user = await requireUser();
  if (!user.organizationId) {
    return <PageShell><p>No organization selected.</p></PageShell>;
  }
  const rules = await loadPayerRulesForOrg(user.organizationId);
  const staleCount = rules.filter((r) => isStaleRule(r.lastReviewedAt)).length;

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Billing → admin"
        title="Payer rules"
        description="Override timely-filing windows, appeal deadlines, cannabis policy, and acknowledgment SLAs without a deploy."
      />

      {staleCount > 0 && (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <CardContent className="py-4">
            <p className="text-sm text-amber-900">
              <strong>{staleCount} rule{staleCount === 1 ? "" : "s"}</strong> haven&apos;t been reviewed in &gt; {Math.round(PAYER_RULE_STALE_MS / (1000 * 60 * 60 * 24))} days.
              Review the staleness column below and re-save with a reason note to clear the warning.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <Eyebrow>Active rules</Eyebrow>
          <CardTitle>{rules.length} payer{rules.length === 1 ? "" : "s"}</CardTitle>
          <CardDescription>Org-specific overrides win over the in-code defaults shown in muted rows.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b">
                  <th className="py-2 pr-4">Payer</th>
                  <th className="py-2 pr-4">Class</th>
                  <th className="py-2 pr-4">Timely filing</th>
                  <th className="py-2 pr-4">Ack SLA</th>
                  <th className="py-2 pr-4">Cannabis</th>
                  <th className="py-2 pr-4">Last reviewed</th>
                  <th className="py-2 pr-4">Source</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-4 font-medium">{r.displayName}</td>
                    <td className="py-2 pr-4">{r.class}</td>
                    <td className="py-2 pr-4">{formatDays(r.timelyFilingDays)} / {formatDays(r.correctedTimelyFilingDays)}</td>
                    <td className="py-2 pr-4">{formatDays(r.ackSlaDays)}</td>
                    <td className="py-2 pr-4">
                      {r.excludesCannabis ? (
                        <Badge tone="danger">Excluded</Badge>
                      ) : r.requiresPriorAuthForCannabis ? (
                        <Badge tone="warning">Prior auth</Badge>
                      ) : (
                        <Badge tone="success">Covered</Badge>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {isStaleRule(r.lastReviewedAt) ? (
                        <Badge tone="warning">{r.lastReviewedAt.toISOString().slice(0, 10)} · stale</Badge>
                      ) : (
                        r.lastReviewedAt.toISOString().slice(0, 10)
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {r.isOrgOverride ? <Badge tone="accent">Org override</Badge> : <span className="text-text-muted">Global</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
