// EMR-143 — Outreach campaigns / SMS broadcast.

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/utils/format";
import { CampaignComposeForm } from "./compose-form";

export const metadata = { title: "Outreach broadcasts" };

export default async function BroadcastsPage() {
  const user = await requireUser();
  const orgId = user.organizationId;
  if (!orgId) {
    return (
      <PageShell>
        <div className="text-sm text-text-muted">No organization context.</div>
      </PageShell>
    );
  }

  const [campaigns, audienceCounts] = await Promise.all([
    prisma.outreachCampaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { recipients: true } },
      },
    }),
    Promise.all([
      prisma.patient.count({
        where: {
          organizationId: orgId,
          deletedAt: null,
          status: "active",
          phone: { not: null },
        },
      }),
      prisma.patient.count({
        where: {
          organizationId: orgId,
          deletedAt: null,
          status: "active",
          email: { not: null },
        },
      }),
    ]),
  ]);

  const [activeWithSms, activeWithEmail] = audienceCounts;

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Communications"
        title="Outreach broadcasts"
        description="Practice-wide SMS or email campaigns. Use thoughtfully — patients can unsubscribe at any time."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card tone="raised">
            <CardHeader>
              <CardTitle className="text-base">New campaign</CardTitle>
              <CardDescription>
                Templates support <code>{`{{firstName}}`}</code> and{" "}
                <code>{`{{lastName}}`}</code>. Active patients with a phone:{" "}
                <strong>{activeWithSms}</strong> · with email:{" "}
                <strong>{activeWithEmail}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CampaignComposeForm />
            </CardContent>
          </Card>
        </div>

        <Card tone="raised">
          <CardHeader>
            <CardTitle className="text-base">Recent campaigns</CardTitle>
            <CardDescription>
              Latest 25 broadcasts in this organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[640px] overflow-y-auto">
            {campaigns.length === 0 ? (
              <EmptyState
                title="No campaigns yet"
                description="Send your first broadcast to see it here."
              />
            ) : (
              campaigns.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg px-3 py-2 hover:bg-surface-muted"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-text truncate">
                      {c.name}
                    </p>
                    <Badge tone={campaignBadgeTone(c.status)}>{c.status}</Badge>
                  </div>
                  <p className="text-[11px] text-text-subtle">
                    {c.channel.toUpperCase()} · {c._count.recipients} recipients
                  </p>
                  <p className="text-[11px] text-text-subtle">
                    {c.createdBy
                      ? `${c.createdBy.firstName} ${c.createdBy.lastName}`
                      : "system"}{" "}
                    · {formatRelative(c.createdAt.toISOString())}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function campaignBadgeTone(
  status: string,
): "success" | "warning" | "danger" | "neutral" | "info" {
  switch (status) {
    case "completed":
      return "success";
    case "scheduled":
    case "sending":
      return "info";
    case "failed":
      return "danger";
    case "cancelled":
      return "warning";
    default:
      return "neutral";
  }
}
