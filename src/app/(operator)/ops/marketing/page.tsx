import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricTile } from "@/components/ui/metric-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { CampaignChannel, CampaignStatus } from "@prisma/client";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Marketing" };

const STATUS_TONE: Record<CampaignStatus, "neutral" | "accent" | "success" | "warning" | "info"> = {
  draft: "neutral",
  scheduled: "info",
  live: "accent",
  paused: "warning",
  completed: "success",
};

const CHANNEL_LABEL: Record<CampaignChannel, string> = {
  email: "Email",
  sms: "SMS",
  social: "Social",
  print: "Print",
  referral: "Referral",
  event: "Event",
  other: "Other",
};

function formatBudget(budget: number | null): string {
  if (budget == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(budget);
}

function dateRange(startAt: Date | null, endAt: Date | null): string {
  if (!startAt && !endAt) return "No dates set";
  if (startAt && !endAt) return `Starts ${formatDate(startAt)}`;
  if (!startAt && endAt) return `Ends ${formatDate(endAt)}`;
  return `${formatDate(startAt)} – ${formatDate(endAt)}`;
}

export default async function OpsMarketingPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const [campaigns, liveCount, draftCount, budgetAgg] = await Promise.all([
    prisma.marketingCampaign.findMany({
      where: { organizationId: orgId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.marketingCampaign.count({
      where: { organizationId: orgId, status: "live" },
    }),
    prisma.marketingCampaign.count({
      where: { organizationId: orgId, status: "draft" },
    }),
    prisma.marketingCampaign.aggregate({
      where: { organizationId: orgId, status: { in: ["live", "scheduled"] } },
      _sum: { budget: true },
    }),
  ]);

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Operations"
        title="Marketing"
        description="Campaigns across every channel — what's live, what's queued, what's in the drawer."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricTile label="Live now" value={liveCount} />
        <MetricTile label="In draft" value={draftCount} />
        <MetricTile
          label="Committed spend"
          value={formatBudget(budgetAgg._sum.budget ?? 0)}
          hint="Live + scheduled campaigns"
        />
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Outreach, referral drives, and events will show up here as they're planned."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{campaign.name}</CardTitle>
                    {campaign.goal && <CardDescription>{campaign.goal}</CardDescription>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge tone={STATUS_TONE[campaign.status]}>{campaign.status}</Badge>
                    <Badge tone="neutral">{CHANNEL_LABEL[campaign.channel]}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>{dateRange(campaign.startAt, campaign.endAt)}</span>
                  <span className="tabular-nums">{formatBudget(campaign.budget)}</span>
                </div>
                {campaign.audience && (
                  <p className="text-xs text-text-subtle">
                    <span className="font-medium text-text-muted">Audience:</span>{" "}
                    {campaign.audience}
                  </p>
                )}
                {campaign.notes && (
                  <p className="text-xs text-text-subtle pt-2 border-t border-border">
                    {campaign.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
