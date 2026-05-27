/**
 * EMR-062 — Ancillary Services
 *
 * Single hub for the non-physician care team: occupational therapy,
 * physical therapy, speech-language pathology, case management, and
 * home health. Pulls every active referral / order across these
 * disciplines into one queue so the clinician can see what's open
 * and route follow-up tasks without bouncing between modules.
 */

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

export const metadata = { title: "Ancillary services" };

type Discipline = "ot" | "pt" | "speech" | "case_mgmt" | "home_health";

interface AncillaryReferral {
  id: string;
  discipline: Discipline;
  patientName: string;
  reason: string;
  status: "pending" | "scheduled" | "in_progress" | "completed" | "declined";
  orderedAt: string;
  nextStep?: string;
  /** Days since order was placed */
  ageDays: number;
}

const DISCIPLINES: Array<{
  key: Discipline;
  label: string;
  blurb: string;
  referralHref: string;
  caseload: number;
  pendingIntake: number;
}> = [
  {
    key: "ot",
    label: "Occupational therapy",
    blurb: "ADLs, fine motor, sensory regulation, return-to-work assessments.",
    referralHref: "/clinic/ancillary?discipline=ot",
    caseload: 14,
    pendingIntake: 3,
  },
  {
    key: "pt",
    label: "Physical therapy",
    blurb: "Mobility, balance, post-op rehab, pain-driven movement therapy.",
    referralHref: "/clinic/ancillary?discipline=pt",
    caseload: 22,
    pendingIntake: 5,
  },
  {
    key: "speech",
    label: "Speech & language",
    blurb: "Swallow studies, aphasia recovery, cognitive-communication therapy.",
    referralHref: "/clinic/ancillary?discipline=speech",
    caseload: 6,
    pendingIntake: 1,
  },
  {
    key: "case_mgmt",
    label: "Case management",
    blurb: "Care coordination, transitional care, social work hand-offs.",
    referralHref: "/clinic/ancillary?discipline=case_mgmt",
    caseload: 31,
    pendingIntake: 4,
  },
  {
    key: "home_health",
    label: "Home health",
    blurb: "Skilled nursing, wound care, IV therapy, in-home rehab.",
    referralHref: "/clinic/ancillary?discipline=home_health",
    caseload: 9,
    pendingIntake: 2,
  },
];

const SAMPLE_REFERRALS: AncillaryReferral[] = [
  {
    id: "anc-001",
    discipline: "pt",
    patientName: "Rivera, M.",
    reason: "Post-arthroscopy meniscus repair — gait + strength",
    status: "scheduled",
    orderedAt: "2026-04-22",
    nextStep: "First eval Wed 9:00",
    ageDays: 8,
  },
  {
    id: "anc-002",
    discipline: "ot",
    patientName: "Nguyen, L.",
    reason: "Long-haul COVID — energy conservation training",
    status: "in_progress",
    orderedAt: "2026-04-09",
    nextStep: "Re-eval at session 6 (next week)",
    ageDays: 21,
  },
  {
    id: "anc-003",
    discipline: "speech",
    patientName: "Patel, A.",
    reason: "Post-stroke aphasia — comprehension > expression",
    status: "pending",
    orderedAt: "2026-04-26",
    nextStep: "Awaiting insurance auth",
    ageDays: 4,
  },
  {
    id: "anc-004",
    discipline: "case_mgmt",
    patientName: "Hassan, K.",
    reason: "SNF → home transition, lives alone",
    status: "in_progress",
    orderedAt: "2026-04-18",
    nextStep: "Home safety eval scheduled Thu",
    ageDays: 12,
  },
  {
    id: "anc-005",
    discipline: "home_health",
    patientName: "Garcia, R.",
    reason: "PICC line maintenance — IV ceftriaxone 4 wks",
    status: "in_progress",
    orderedAt: "2026-04-21",
    nextStep: "Daily flush + dressing change",
    ageDays: 9,
  },
  {
    id: "anc-006",
    discipline: "pt",
    patientName: "Olafsson, B.",
    reason: "Chronic LBP — McKenzie protocol",
    status: "completed",
    orderedAt: "2026-02-15",
    nextStep: "Discharge summary received",
    ageDays: 74,
  },
  {
    id: "anc-007",
    discipline: "ot",
    patientName: "Williams, J.",
    reason: "Hand therapy after distal radius ORIF",
    status: "pending",
    orderedAt: "2026-04-29",
    nextStep: "Patient to call for intake",
    ageDays: 1,
  },
];

export default async function AncillaryPage() {
  const user = await requireUser();
  if (!user.organizationId) {
    return (
      <PageShell>
        <div className="text-sm text-text-muted">No organization context.</div>
      </PageShell>
    );
  }

  const totalCaseload = DISCIPLINES.reduce((acc, d) => acc + d.caseload, 0);
  const totalPending = DISCIPLINES.reduce((acc, d) => acc + d.pendingIntake, 0);
  const open = SAMPLE_REFERRALS.filter(
    (r) => r.status === "pending" || r.status === "scheduled" || r.status === "in_progress"
  );
  const stale = open.filter((r) => r.ageDays > 14);

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Ancillary services"
        title="Care team queue"
        description="OT, PT, speech, case management, and home health — all open referrals, with the next step clearly named so nothing slides."
        actions={
          <Link href="/clinic/ancillary/new">
            <Button variant="primary" size="sm">
              New referral
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MetricTile
          label="Active caseload"
          value={totalCaseload}
          accent="forest"
          hint="Patients across all disciplines"
        />
        <MetricTile
          label="Pending intake"
          value={totalPending}
          accent={totalPending > 0 ? "amber" : "none"}
          hint="Awaiting first eval or auth"
        />
        <MetricTile
          label="Open this view"
          value={open.length}
          accent="forest"
          hint="Pending + scheduled + in progress"
        />
        <MetricTile
          label="Stale > 14 days"
          value={stale.length}
          accent={stale.length > 0 ? "amber" : "none"}
          hint="No movement since order"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {DISCIPLINES.map((d) => (
          <Card key={d.key} tone="raised">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{d.label}</CardTitle>
                <Badge tone={d.pendingIntake > 0 ? "warning" : "neutral"}>
                  {d.pendingIntake} pending
                </Badge>
              </div>
              <CardDescription>{d.blurb}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">
                  Caseload
                </p>
                <p className="font-display text-2xl text-text tabular-nums">
                  {d.caseload}
                </p>
              </div>
              <Link href={d.referralHref}>
                <Button variant="secondary" size="sm">
                  Open queue
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-base">Open referrals</CardTitle>
          <CardDescription>
            Cross-discipline queue. Click a row to open the patient's chart with
            the relevant ancillary tab in focus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {open.length === 0 ? (
            <EmptyState
              title="No open referrals"
              description="When you order OT, PT, speech, case management, or home health from a chart, it lands here."
            />
          ) : (
            open.map((r) => (
              <ReferralRow key={r.id} referral={r} />
            ))
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function ReferralRow({ referral }: { referral: AncillaryReferral }) {
  const disciplineLabel =
    DISCIPLINES.find((d) => d.key === referral.discipline)?.label ??
    referral.discipline;
  const stale = referral.ageDays > 14;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_220px_140px] items-center gap-3 rounded-lg px-3 py-3 hover:bg-surface-muted">
      <div className="min-w-0">
        <p className="text-sm text-text">
          {referral.patientName}{" "}
          <span className="text-text-subtle">· {disciplineLabel}</span>
        </p>
        <p className="text-[11px] text-text-subtle truncate">{referral.reason}</p>
      </div>
      <div>
        <Badge tone={statusTone(referral.status)}>
          {referral.status.replace("_", " ")}
        </Badge>
      </div>
      <p className="text-xs text-text-muted truncate">
        {referral.nextStep ?? "—"}
      </p>
      <p className="text-xs text-text-subtle tabular-nums">
        {referral.ageDays}d ago
        {stale && (
          <Badge tone="warning" className="ml-2">
            stale
          </Badge>
        )}
      </p>
    </div>
  );
}

function statusTone(
  status: AncillaryReferral["status"]
): "success" | "warning" | "danger" | "neutral" | "info" {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
    case "scheduled":
      return "info";
    case "pending":
      return "warning";
    case "declined":
      return "danger";
    default:
      return "neutral";
  }
}
