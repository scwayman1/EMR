/**
 * EMR-090 — ER / hospital admission inbox
 *
 * One queue for every active admission affecting an org's patients,
 * with the planNotifications() routing decision shown beside each
 * event so the provider can see why a given member was paged or
 * left in-app only.
 *
 * Sample data here exercises the routing engine for the demo. Real
 * production traffic populates this from the ADT feed adapter.
 */

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
import { MetricTile } from "@/components/ui/metric-tile";
import { EmptyState } from "@/components/ui/empty-state";
import {
  planNotifications,
  type AdtEvent,
  type AdtAcuity,
  type CareTeamMember,
} from "@/lib/clinical/admission-notify";

export const metadata = { title: "Admissions" };

const NOW = new Date();
const hoursAgo = (n: number) =>
  new Date(NOW.getTime() - n * 60 * 60 * 1000).toISOString();

const CARE_TEAM: CareTeamMember[] = [
  {
    userId: "u-pcp",
    firstName: "Sam",
    lastName: "Patel",
    roles: ["pcp", "primary"],
    contact: { pageNumber: "555-1111", email: "sam@example.com" },
  },
  {
    userId: "u-cm",
    firstName: "Alex",
    lastName: "Doe",
    roles: ["case_manager"],
    contact: { smsNumber: "555-2222", email: "alex@example.com" },
  },
];

const SAMPLE_EVENTS: AdtEvent[] = [
  {
    id: "adt-001",
    type: "ed_arrival",
    occurredAt: hoursAgo(2),
    patient: { id: "p-1", firstName: "Rivera", lastName: "M.", dob: "1958-07-04" },
    facility: { name: "St. Mary General", type: "ed", id: "stm-001" },
    reason: "Chest pain — ROMI",
    critical: true,
  },
  {
    id: "adt-002",
    type: "admit",
    occurredAt: hoursAgo(5),
    patient: { id: "p-2", firstName: "Nguyen", lastName: "L.", dob: "1971-02-19" },
    facility: { name: "Memorial East", type: "hospital", id: "mem-east" },
    reason: "Pneumonia, requires IV antibiotics",
    icd10: ["J18.9"],
  },
  {
    id: "adt-003",
    type: "discharge",
    occurredAt: hoursAgo(18),
    patient: { id: "p-3", firstName: "Hassan", lastName: "K.", dob: "1942-11-22" },
    facility: { name: "Riverside SNF", type: "snf", id: "river-snf" },
    reason: "Stable, returning home with home health",
    icd10: ["S72.001A"],
  },
];

const ACUITY_TONE: Record<AdtAcuity, "danger" | "warning" | "info"> = {
  critical: "danger",
  urgent: "warning",
  routine: "info",
};

export default async function AdmissionsPage() {
  const user = await requireUser();
  if (!user.organizationId) {
    return (
      <PageShell>
        <div className="text-sm text-text-muted">No organization context.</div>
      </PageShell>
    );
  }

  const events = SAMPLE_EVENTS;
  const enriched = events.map((event) => ({
    event,
    plans: planNotifications({ event, careTeam: CARE_TEAM, now: NOW }),
  }));

  const criticalCount = enriched.filter((e) =>
    e.plans.some((p) => p.acuity === "critical"),
  ).length;

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Hospital feed"
        title="Admissions & discharges"
        description="Live ER/admit/discharge events for your panel. Care-team routing is shown so the right member gets the right channel — pager for critical, SMS for case management, email or in-app for routine."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MetricTile
          label="Events"
          value={events.length}
          accent="forest"
          hint="Last 24h"
        />
        <MetricTile
          label="Critical"
          value={criticalCount}
          accent={criticalCount > 0 ? "amber" : "none"}
          hint="Paged immediately"
        />
        <MetricTile
          label="Active admits"
          value={events.filter((e) => e.type === "admit" || e.type === "ed_arrival").length}
          accent="forest"
          hint="ED + inpatient"
        />
        <MetricTile
          label="Discharges"
          value={events.filter((e) => e.type === "discharge" || e.type === "ed_discharge").length}
          accent="none"
          hint="Need med rec"
        />
      </div>

      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-base">Admission queue</CardTitle>
          <CardDescription>
            Each row shows the ADT event plus the notification plan generated
            for your care team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {enriched.length === 0 ? (
            <EmptyState
              title="No active admission events"
              description="When a patient in your panel hits an ER or is admitted, this list will fill in within minutes."
            />
          ) : (
            enriched.map(({ event, plans }) => {
              const acuity = plans[0]?.acuity ?? "routine";
              return (
                <div
                  key={event.id}
                  className="rounded-lg border border-border p-4 hover:bg-surface-muted"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge tone={ACUITY_TONE[acuity]}>
                          {acuity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-text-subtle">
                          {event.type.replace("_", " ")} ·{" "}
                          {new Date(event.occurredAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-text font-medium">
                        {event.patient.firstName} {event.patient.lastName}
                      </p>
                      <p className="text-[13px] text-text-muted">
                        {event.facility.name} — {event.reason}
                      </p>
                    </div>
                  </div>

                  {plans.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/60">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle mb-2">
                        Notification plan
                      </p>
                      <div className="space-y-1.5">
                        {plans.map((p) => (
                          <div
                            key={`${event.id}-${p.recipient.userId}`}
                            className="flex items-center gap-2 text-xs text-text-muted"
                          >
                            <Badge tone="neutral">{p.channel}</Badge>
                            <span className="font-medium text-text">
                              {p.recipient.firstName} {p.recipient.lastName}
                            </span>
                            <span className="text-text-subtle">— {p.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
