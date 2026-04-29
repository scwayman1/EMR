import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import {
  listCountryRules,
  formatCountryMoney,
  publicCoverageUnlikely,
  SUPPORTED_COUNTRIES,
} from "@/lib/billing/international";

export const metadata = { title: "International Billing" };

export default function InternationalBillingPage() {
  const rules = listCountryRules();
  const totalCarriers = rules.reduce((sum, r) => sum + r.carriers.length, 0);
  const reimbursableCount = rules.filter((r) => r.cannabisPolicy.reimbursableUnderPublic).length;

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Global rollout"
        title="International billing framework"
        description="Country-aware billing rules registry. Each country has its own coding system, currency, filing windows, and cannabis-reimbursement posture. Launch coverage: US, UK, Canada, Germany, Australia."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Countries live" value={String(SUPPORTED_COUNTRIES.length)} size="md" />
        <StatCard label="Carriers wired" value={String(totalCarriers)} size="md" />
        <StatCard
          label="Public reimbursement"
          value={`${reimbursableCount}/${rules.length}`}
          tone="accent"
          size="md"
        />
        <StatCard
          label="Coding systems"
          value={String(new Set(rules.map((r) => r.codingSystem)).size)}
          size="md"
        />
      </div>

      <div className="space-y-4">
        {rules.map((rule) => (
          <Card key={rule.countryCode} tone="raised">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>
                    {rule.countryName}{" "}
                    <span className="text-text-subtle text-sm font-normal">· {rule.countryCode}</span>
                  </CardTitle>
                  <CardDescription>
                    {rule.codingSystem} · {rule.currency} · {rule.locale}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {publicCoverageUnlikely(rule.countryCode) ? (
                    <Badge tone="warning">Self-pay route likely</Badge>
                  ) : (
                    <Badge tone="success">Public reimbursement available</Badge>
                  )}
                  <Badge tone="info">VAT {rule.vatRate}%</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-subtle">
                    Timely filing
                  </div>
                  <div className="text-text font-medium">{rule.timelyFilingDays} days</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-subtle">
                    Appeal window
                  </div>
                  <div className="text-text font-medium">{rule.appealDeadlineDays} days</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-subtle">
                    Sample charge
                  </div>
                  <div className="text-text font-medium tabular-nums">
                    {formatCountryMoney(rule.countryCode, 12500)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-subtle">
                    Medical taxable
                  </div>
                  <div className="text-text font-medium">
                    {rule.medicalServicesTaxable ? "Yes" : "No"}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-2">
                  Carriers
                </div>
                <div className="flex flex-wrap gap-2">
                  {rule.carriers.map((c) => (
                    <Badge
                      key={c.id}
                      tone={
                        c.kind === "national"
                          ? "highlight"
                          : c.kind === "regional"
                            ? "info"
                            : "neutral"
                      }
                    >
                      {c.displayName}
                      {!c.electronicSubmission && " · paper"}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="text-xs text-text-muted bg-surface-muted rounded-md p-3 leading-relaxed">
                <span className="font-medium text-text">Cannabis policy: </span>
                {rule.cannabisPolicy.citation}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
