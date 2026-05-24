// Drug ecosystem integrations dashboard.
//
// Surfaces a single-pane operations view for the EMR's outbound
// pharmaceutical connections:
//
//   • Connection health — environment, configured services,
//     last success/failure timestamps, rolling rejection rate
//   • NCPDP SCRIPT transactions — recent Surescripts traffic
//     with status, latency, and confirmation numbers
//   • Message mix — counter table by message type so admins can
//     see what kinds of traffic are flowing
//   • ePA queue — open prior-authorization requests waiting on
//     either the provider or the payer
//
// Read-only view. Acting on rows happens in the prescribe flow
// and the existing pharmacy communications console; this page
// is the bird's-eye health check.

import Link from "next/link";

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
import { Button } from "@/components/ui/button";
import { MetricTile } from "@/components/ui/metric-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/utils/format";

import {
  loadDrugEcosystemConfig,
  summarize,
} from "@/lib/integrations/drug-ecosystem/config";
import {
  countByMessageType,
  getConnectionHealth,
  listRecentTransactions,
} from "@/lib/integrations/drug-ecosystem/transactions";
import {
  countEpaByStatus,
  listOpenEpaRequests,
} from "@/lib/integrations/drug-ecosystem/epa-store";

export const metadata = { title: "Drug ecosystem integrations" };

export default async function IntegrationsDashboardPage() {
  const user = await requireUser();
  if (!user.organizationId) {
    return (
      <PageShell>
        <div className="text-sm text-text-muted">No organization context.</div>
      </PageShell>
    );
  }

  const orgId = user.organizationId;
  const config = summarize(loadDrugEcosystemConfig());

  const [health, recent, messageMix, openEpa, epaCounts] = await Promise.all([
    getConnectionHealth(orgId),
    listRecentTransactions(orgId, 20),
    countByMessageType(orgId),
    listOpenEpaRequests(orgId, 10),
    countEpaByStatus(orgId),
  ]);

  const rejectionRatePct =
    health.recentRejectionRate === null
      ? "—"
      : `${(health.recentRejectionRate * 100).toFixed(1)}%`;

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Integrations"
        title="Drug ecosystem"
        description="NCPDP SCRIPT, RxNorm, RTPB, medication history, ePA, and FHIR. One pane for the EMR's outbound pharmaceutical connections."
        actions={
          <Link href="/clinic/pharmacy">
            <Button variant="ghost" size="sm">
              Pharmacy console
            </Button>
          </Link>
        }
      />

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Connection state</CardTitle>
          <CardDescription>
            Environment:{" "}
            <Badge tone={environmentTone(config.environment)}>
              {config.environment.replace("_", " ")}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <ServiceTile
              name="Surescripts"
              endpoint={config.surescripts.endpoint}
              configured={config.surescripts.configured}
              hint="NCPDP SCRIPT 2017071 / cert tester"
            />
            <ServiceTile
              name="RTPB"
              endpoint={config.rtpb.endpoint}
              configured={config.rtpb.configured}
              hint="Real-Time Prescription Benefit"
            />
            <ServiceTile
              name="ePA"
              endpoint={config.epa.endpoint}
              configured={config.epa.configured}
              hint="CoverMyMeds / CompletEPA"
            />
            <ServiceTile
              name="RxNorm"
              endpoint={config.rxnorm.endpoint}
              configured={true}
              hint="NLM RxNav — public"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MetricTile
          label="Transactions (total)"
          value={health.totalTransactions}
          accent="none"
          hint="All-time SCRIPT round trips"
        />
        <MetricTile
          label="Accepted / delivered"
          value={health.acceptedCount}
          accent={health.acceptedCount > 0 ? "forest" : "none"}
          hint="Confirmed by gateway"
        />
        <MetricTile
          label="Rejected"
          value={health.rejectedCount}
          accent={health.rejectedCount > 0 ? "amber" : "none"}
          hint={`24h rate: ${rejectionRatePct}`}
        />
        <MetricTile
          label="Avg latency"
          value={
            health.averageLatencyMs === null
              ? "—"
              : `${health.averageLatencyMs} ms`
          }
          accent="none"
          hint={
            health.lastSuccessAt
              ? `Last OK ${formatRelative(health.lastSuccessAt)}`
              : "No successful rounds yet"
          }
        />
      </div>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Recent NCPDP transactions</CardTitle>
          <CardDescription>
            Most recent first. Each row is one inbound or outbound SCRIPT
            message exchanged with the configured gateway.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              description="When a clinician transmits an Rx or the pharmacy sends a refill request, the round trip will show up here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted text-[12px] uppercase tracking-wide border-b border-border-strong/40">
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Direction</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Confirmation</th>
                    <th className="py-2 pr-4">Latency</th>
                    <th className="py-2 pr-4">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-border-strong/20 last:border-0"
                    >
                      <td className="py-2 pr-4 whitespace-nowrap text-text-muted">
                        {formatRelative(tx.createdAt)}
                      </td>
                      <td className="py-2 pr-4 font-medium text-text">
                        {tx.messageType}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge tone={tx.direction === "outbound" ? "info" : "highlight"}>
                          {tx.direction}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge tone={statusTone(tx.status)}>{tx.status}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-text-muted font-mono text-[12px]">
                        {tx.confirmationNumber ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-text-muted">
                        {tx.latencyMs === null ? "—" : `${tx.latencyMs} ms`}
                      </td>
                      <td className="py-2 pr-4 text-text-muted text-[12px]">
                        {tx.errorDescription ?? tx.surescriptsMessageId.slice(0, 12) + "…"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card tone="raised">
          <CardHeader>
            <CardTitle className="text-base">Message mix</CardTitle>
            <CardDescription>
              Counts by NCPDP SCRIPT message type, all time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(messageMix).length === 0 ? (
              <p className="text-sm text-text-muted">No traffic yet.</p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(messageMix)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <li
                      key={type}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-text">{type}</span>
                      <span className="font-mono text-text-muted">{count}</span>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card tone="raised">
          <CardHeader>
            <CardTitle className="text-base">ePA queue</CardTitle>
            <CardDescription>
              Open prior-authorization requests by status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.entries(epaCounts).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between text-sm px-3 py-2 rounded-md bg-surface-muted/40"
                >
                  <span className="text-text capitalize">
                    {status.replace("_", " ")}
                  </span>
                  <span className="font-mono text-text-muted">{count}</span>
                </div>
              ))}
              {Object.keys(epaCounts).length === 0 && (
                <p className="text-sm text-text-muted col-span-2">
                  No ePA activity.
                </p>
              )}
            </div>
            {openEpa.length === 0 ? (
              <p className="text-sm text-text-muted">No open requests.</p>
            ) : (
              <ul className="space-y-2">
                {openEpa.map((epa) => (
                  <li
                    key={epa.id}
                    className="text-sm flex items-center justify-between border-t border-border-strong/20 pt-2"
                  >
                    <div>
                      <div className="font-medium text-text">
                        {epa.drugDescription}
                      </div>
                      <div className="text-text-muted text-[12px]">
                        {epa.payerName} · {formatRelative(epa.createdAt)}
                      </div>
                    </div>
                    <Badge tone={epaStatusTone(epa.status)}>
                      {epa.status.replace("_", " ")}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card tone="outlined">
        <CardHeader>
          <CardTitle className="text-base">Endpoints</CardTitle>
          <CardDescription>
            Configure credentials via env vars:{" "}
            <code className="text-[12px]">SURESCRIPTS_*</code>,{" "}
            <code className="text-[12px]">RTPB_*</code>,{" "}
            <code className="text-[12px]">EPA_*</code>. Set{" "}
            <code className="text-[12px]">DRUG_ECOSYSTEM_ENV</code> to{" "}
            <code className="text-[12px]">cert_tester</code> to point at the
            Surescripts Certification Tester gateway.
          </CardDescription>
        </CardHeader>
      </Card>
    </PageShell>
  );
}

function ServiceTile({
  name,
  endpoint,
  configured,
  hint,
}: {
  name: string;
  endpoint: string;
  configured: boolean;
  hint: string;
}) {
  return (
    <div className="border border-border-strong/40 rounded-lg p-3 bg-surface-muted/30">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-text">{name}</span>
        <Badge tone={configured ? "success" : "warning"}>
          {configured ? "configured" : "mock"}
        </Badge>
      </div>
      <div className="text-[12px] text-text-muted truncate" title={endpoint}>
        {endpoint}
      </div>
      <div className="text-[11px] text-text-muted mt-1">{hint}</div>
    </div>
  );
}

function environmentTone(
  env: string,
): "neutral" | "info" | "warning" | "success" | "danger" {
  switch (env) {
    case "production":
      return "danger";
    case "cert_tester":
      return "info";
    case "sandbox":
    default:
      return "neutral";
  }
}

function statusTone(
  status: string,
): "neutral" | "info" | "warning" | "success" | "danger" {
  switch (status) {
    case "accepted":
    case "delivered":
      return "success";
    case "queued":
      return "info";
    case "rejected":
    case "error":
      return "danger";
    case "pending":
    default:
      return "neutral";
  }
}

function epaStatusTone(
  status: string,
): "neutral" | "info" | "warning" | "success" | "danger" {
  switch (status) {
    case "approved":
      return "success";
    case "denied":
      return "danger";
    case "questions_pending":
      return "warning";
    case "awaiting_response":
      return "info";
    default:
      return "neutral";
  }
}
