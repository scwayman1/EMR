// EMR-002 / EMR-017 — Clinician dispensary directory.
//
// A first-pass locator surface. Lists every dispensary registered to
// the practice with active SKU counts and last-sync timestamp. Until
// we wire up Google Maps embed (Maps API key gated), the list view
// surfaces enough to triage: which integrations are healthy, which
// have stale catalogs, and which carry stock right now.

import { redirect } from "next/navigation";
import Link from "next/link";

import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow, LeafSprig } from "@/components/ui/ornament";
import { getCurrentUser } from "@/lib/auth/session";
import { listDispensariesForOrg } from "@/lib/dispensary";
import { ROLE_HOME } from "@/lib/rbac/roles";

export const metadata = { title: "Dispensaries" };

function relativeAge(date: Date | null | undefined): string {
  if (!date) return "Never synced";
  const ms = Date.now() - new Date(date).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "Synced just now";
  if (min < 60) return `Synced ${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Synced ${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `Synced ${d}d ago`;
}

export default async function ClinicDispensariesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (
    !user.roles.some((r) => r === "clinician" || r === "practice_owner" || r === "operator")
  ) {
    redirect(ROLE_HOME[user.roles[0]] ?? "/");
  }
  if (!user.organizationId) {
    return (
      <PageShell maxWidth="max-w-[960px]">
        <PageHeader title="Dispensaries" eyebrow="Locator" description="No practice selected." />
      </PageShell>
    );
  }

  const dispensaries = await listDispensariesForOrg(user.organizationId);
  const active = dispensaries.filter((d) => d.status === "active");
  const inactive = dispensaries.filter((d) => d.status !== "active");

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <PageHeader
        eyebrow="Pharmacology"
        title="Dispensary directory"
        description="Licensed dispensaries integrated with this practice. Clinicians can match patient regimens to live SKUs nearby."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card tone="raised">
          <CardContent className="py-5">
            <Eyebrow>Active</Eyebrow>
            <p className="font-display text-3xl mt-2 text-text">{active.length}</p>
            <p className="text-xs text-text-muted mt-1">
              Receiving SKU sync feeds.
            </p>
          </CardContent>
        </Card>
        <Card tone="raised">
          <CardContent className="py-5">
            <Eyebrow>Live SKUs</Eyebrow>
            <p className="font-display text-3xl mt-2 text-text">
              {active.reduce((acc, d) => acc + d.skuCount, 0).toLocaleString()}
            </p>
            <p className="text-xs text-text-muted mt-1">
              In stock across all dispensaries.
            </p>
          </CardContent>
        </Card>
        <Card tone="raised">
          <CardContent className="py-5">
            <Eyebrow>Pending / Inactive</Eyebrow>
            <p className="font-display text-3xl mt-2 text-text">{inactive.length}</p>
            <p className="text-xs text-text-muted mt-1">
              Awaiting credentials or paused.
            </p>
          </CardContent>
        </Card>
      </div>

      {dispensaries.length === 0 ? (
        <EmptyState
          icon={<LeafSprig size={28} className="text-accent" />}
          title="No dispensaries yet"
          description="Register a dispensary integration to start syncing SKUs and pinning locations on the patient locator map."
        />
      ) : (
        <div className="space-y-3">
          {dispensaries.map((d) => (
            <Card key={d.id} tone="raised">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      {d.name}
                      <Badge tone={d.status === "active" ? "success" : "warning"}>
                        {d.status}
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-text-muted mt-1">
                      {d.addressLine1}, {d.city}, {d.state} {d.postalCode}
                    </p>
                  </div>
                  <div className="text-right text-xs text-text-muted shrink-0">
                    <p className="font-medium text-text">{d.skuCount.toLocaleString()} SKUs</p>
                    <p className="mt-0.5">{relativeAge(d.lastSyncedAt)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                  {d.phone && <span>📞 {d.phone}</span>}
                  {d.hoursLine && <span>🕒 {d.hoursLine}</span>}
                  {d.websiteUrl && (
                    <Link
                      href={d.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      Visit site →
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
