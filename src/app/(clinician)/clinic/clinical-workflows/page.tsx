/**
 * Phase-9 Track 2 — Clinical Workflows hub
 *
 * Single landing page that surfaces all of the Phase-9 clinical-workflow
 * tickets behind one well-organized index, with a metric tile per module
 * and a deep-link to the dedicated surface for each.
 *
 * Modules surfaced here:
 *   - EMR-062 — Ancillary services queue
 *   - EMR-070 — USPSTF screening reminders
 *   - EMR-076 — AI prior authorization
 *   - EMR-077 — Modular EMAR
 *   - EMR-078 — Smart specialist referrals
 *   - EMR-079 — Dementia / Alzheimer's screening
 *   - EMR-083 — Pediatric module
 *   - EMR-090 — ER / hospital admission notifications
 *   - EMR-092 — Dual treatment protocols (Western + Eastern)
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
import { MetricTile } from "@/components/ui/metric-tile";
import { Eyebrow } from "@/components/ui/ornament";

export const metadata = { title: "Clinical workflows" };

interface WorkflowModule {
  ticket: string;
  title: string;
  description: string;
  href?: string;
  /** Short status badge shown in the corner. */
  badge?: { label: string; tone: "success" | "warning" | "info" | "neutral" };
  /** What the team actually clicks on once they're inside. */
  surfaces: string[];
}

const MODULES: WorkflowModule[] = [
  {
    ticket: "EMR-062",
    title: "Ancillary services",
    description:
      "OT, PT, speech, case management, and home health in one cross-discipline queue with sign-off back to the primary provider.",
    href: "/clinic/ancillary",
    badge: { label: "Live", tone: "success" },
    surfaces: [
      "Cross-discipline open referrals queue",
      "Stale > 14 day alerts",
      "Completion sign-off with PCP recommendation block",
    ],
  },
  {
    ticket: "EMR-070",
    title: "USPSTF screening reminders",
    description:
      "Emoji-first preventive screening checklist scored against the patient's profile. Drives the chart-side punch list and AI fairytale summary.",
    badge: { label: "Engine", tone: "info" },
    surfaces: [
      "Health-maintenance score 0–100",
      "Punch list ordered overdue-first",
      "Fairytale-paragraph generator for the patient summary",
    ],
  },
  {
    ticket: "EMR-076",
    title: "AI prior authorization",
    description:
      "AI agent handles first submission, deterministic auto-appeal on documentation denials, and escalation to the provider after the second denial.",
    href: "/clinic/prior-auth-queue",
    badge: { label: "Live", tone: "success" },
    surfaces: [
      "Autonomous packet submission for clean requests",
      "Provider review gate for biologics + controlled substances",
      "Auto-appeal addendum builder by denial reason",
    ],
  },
  {
    ticket: "EMR-077",
    title: "Modular EMAR",
    description:
      "Top-200 generic formulary + cannabis regimen administration log routed through the same audit shim.",
    href: "/clinic/prescribe",
    badge: { label: "Live", tone: "success" },
    surfaces: [
      "Searchable generic + brand formulary",
      "Per-dose administration ledger",
      "Decodes cleanly to a future MedicationAdministration table",
    ],
  },
  {
    ticket: "EMR-078",
    title: "Smart specialist referrals",
    description:
      "Specialty-aware curation: every chart fact scored against the target specialty's interest profile, with default redaction for sensitive content.",
    badge: { label: "Engine", tone: "info" },
    surfaces: [
      "Specialty interest profiles (cardiology, psychiatry, oncology, …)",
      "Sensitive-content redaction with 42 CFR Part 2 consent flagging",
      "Force-include override for clinician judgement",
    ],
  },
  {
    ticket: "EMR-079",
    title: "Dementia / Alzheimer's screening",
    description:
      "Mini-Cog (clinician) + AD8 (informant) composite. Surfaces follow-up flag at the top of the chart when either is concerning.",
    badge: { label: "Engine", tone: "info" },
    surfaces: [
      "Mini-Cog scoring per Borson 2000",
      "AD8 scoring per Galvin 2005",
      "Composite recommendation w/ memory clinic referral trigger",
    ],
  },
  {
    ticket: "EMR-083",
    title: "Pediatric module",
    description:
      "CDC BMI-for-age categories, AAP well-child schedule, and ACIP primary-series gap detection — all pure, all runnable without backfilled data.",
    badge: { label: "Engine", tone: "info" },
    surfaces: [
      "BMI category (underweight / healthy / overweight / obese)",
      "Next AAP well-child visit lookup",
      "Immunization catch-up gaps with CVX codes",
    ],
  },
  {
    ticket: "EMR-090",
    title: "ER / hospital admission feed",
    description:
      "ADT-style admission events fan out to the right care-team members via the right channel — pager for critical, SMS for case mgmt, email for routine.",
    href: "/clinic/admissions",
    badge: { label: "Live", tone: "success" },
    surfaces: [
      "Acuity classifier (critical / urgent / routine)",
      "Channel routing by role + acuity",
      "Quiet-hours deferral for non-critical events",
    ],
  },
  {
    ticket: "EMR-092",
    title: "Dual treatment protocols",
    description:
      "Side-by-side Western + Eastern (cannabis / acupuncture / mind-body) protocols with explicit interaction surfacing.",
    href: "/clinic/protocols",
    badge: { label: "Live", tone: "success" },
    surfaces: [
      "Three seed protocols: low-back pain, PTSD nights, CINV",
      "Cross-arm interaction detection (warfarin+CBD, SSRI+SJW)",
      "Single sorted timeline across both arms",
    ],
  },
];

export default async function ClinicalWorkflowsHubPage() {
  const user = await requireUser();
  if (!user.organizationId) {
    return (
      <PageShell>
        <div className="text-sm text-text-muted">No organization context.</div>
      </PageShell>
    );
  }

  const live = MODULES.filter((m) => m.badge?.label === "Live").length;
  const engines = MODULES.filter(
    (m) => m.badge?.label === "Engine" || m.badge?.label === "AI",
  ).length;

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Clinical workflows"
        title="Care delivery toolkit"
        description="Every Phase-9 Track-2 clinical workflow in one index. Each card opens the live surface, or — when the work is a pure decision engine — describes what the engine drives."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <MetricTile
          label="Modules in track"
          value={MODULES.length}
          accent="forest"
          hint="Phase-9 Track 2 — Clinical Workflows"
        />
        <MetricTile
          label="Live UI surfaces"
          value={live}
          accent="forest"
          hint="Open queues + chart workflows"
        />
        <MetricTile
          label="Decision engines"
          value={engines}
          accent="forest"
          hint="Pure libs driving UI"
        />
        <MetricTile
          label="Audit-ready"
          value={MODULES.length}
          accent="none"
          hint="All emit structured events"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m) => (
          <Card key={m.ticket} tone="raised">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <Eyebrow>{m.ticket}</Eyebrow>
                {m.badge && (
                  <Badge tone={m.badge.tone}>{m.badge.label}</Badge>
                )}
              </div>
              <CardTitle className="text-base mt-1">{m.title}</CardTitle>
              <CardDescription>{m.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 mb-4">
                {m.surfaces.map((s) => (
                  <li key={s} className="text-[13px] text-text-muted flex gap-2">
                    <span aria-hidden className="text-accent">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              {m.href ? (
                <Link
                  href={m.href}
                  className="text-[13px] font-medium text-accent hover:underline"
                >
                  Open surface →
                </Link>
              ) : (
                <span className="text-[11px] uppercase tracking-[0.12em] text-text-subtle">
                  Engine — wired into chart surfaces
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
