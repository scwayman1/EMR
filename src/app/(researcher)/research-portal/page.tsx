// EMR-123 — Researcher portal landing page.
//
// The cohort-scoped, de-identified view a credentialed researcher gets
// after authenticating. Surfaces their active cohort manifests, the
// minimum-cell threshold in force, and quick links to the export
// builder + double-blind study allocator.

import Link from "next/link";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  CohortPseudonymizer,
  buildCohortManifest,
  deIdentifyPatient,
  suppressSmallCells,
  type RawPatientFacts,
} from "@/lib/billing/research-export";

export const metadata = { title: "Researcher portal" };

const PORTAL_SALT = "researcher_portal_demo_salt_2026__min_16chars";

const RAW_PATIENTS: RawPatientFacts[] = [
  { patientId: "p1", dateOfBirth: new Date("1957-08-12"), sex: "female", race: "Black or African American", ethnicity: "Non-Hispanic", smokingStatus: "former", substanceHistory: null, zipCode: "80302", socioeconomicTier: "middle" },
  { patientId: "p2", dateOfBirth: new Date("1971-02-22"), sex: "male", race: "White", ethnicity: "Non-Hispanic", smokingStatus: "never", substanceHistory: null, zipCode: "80303", socioeconomicTier: "middle" },
  { patientId: "p3", dateOfBirth: new Date("1986-11-30"), sex: "female", race: "Asian", ethnicity: "Non-Hispanic", smokingStatus: "never", substanceHistory: null, zipCode: "80305", socioeconomicTier: "upper" },
  { patientId: "p4", dateOfBirth: new Date("1992-04-04"), sex: "male", race: "White", ethnicity: "Hispanic", smokingStatus: "current", substanceHistory: "cannabis daily", zipCode: "80301", socioeconomicTier: "lower" },
];

const COHORTS = [
  {
    cohortId: "chronic_pain_2026q2",
    label: "Chronic pain · 2026 Q2",
    scope: "billing-and-outcomes" as const,
    minCellSize: 5,
    studyDesign: "observational",
    irbApprovalNumber: "IRB-2026-014",
    status: "active",
  },
  {
    cohortId: "anxiety_thc_cbd_ratio_pilot",
    label: "Anxiety · THC/CBD ratio pilot",
    scope: "full-clinical" as const,
    minCellSize: 5,
    studyDesign: "double-blind, 2-arm",
    irbApprovalNumber: "IRB-2026-021",
    status: "active",
  },
  {
    cohortId: "insomnia_cbn_2025q4",
    label: "Insomnia · CBN sublingual",
    scope: "billing-and-outcomes" as const,
    minCellSize: 5,
    studyDesign: "observational",
    irbApprovalNumber: "IRB-2025-088",
    status: "closed",
  },
];

export default function ResearcherPortalPage() {
  const pseudo = new CohortPseudonymizer(PORTAL_SALT);
  const deIdentified = RAW_PATIENTS.map((p) => deIdentifyPatient(p, pseudo));
  const { kept } = suppressSmallCells(deIdentified, 1);
  const manifest = buildCohortManifest({
    cohortId: COHORTS[0].cohortId,
    scope: COHORTS[0].scope,
    patientCount: kept.length,
    claimCount: 0,
    minCellSize: COHORTS[0].minCellSize,
  });

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Researcher"
        title="Welcome to the researcher portal"
        description="Cohort-scoped, de-identified data for approved studies. Direct identifiers, full DOB, and full ZIP are never exposed; small cells are suppressed at the cohort's IRB-approved threshold."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active cohorts" value={String(COHORTS.filter((c) => c.status === "active").length)} size="md" />
        <StatCard label="Closed cohorts" value={String(COHORTS.filter((c) => c.status === "closed").length)} tone="neutral" size="md" />
        <StatCard label="Default min cell" value="5" tone="info" size="md" hint="HIPAA Safe Harbor" />
        <StatCard label="Salt" value="cohort-scoped" tone="success" size="md" hint="rotated per export" />
      </div>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>My cohorts</CardTitle>
          <CardDescription>
            Open a cohort to view its manifest, dimensions, and link out to the export builder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider">Cohort</th>
                  <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider">IRB</th>
                  <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider">Design</th>
                  <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider">Scope</th>
                  <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider text-right">Min cell</th>
                  <th className="py-2 text-text-subtle text-[11px] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {COHORTS.map((c) => (
                  <tr key={c.cohortId}>
                    <td className="py-2 pr-3">
                      <p className="text-text">{c.label}</p>
                      <p className="text-[11px] text-text-subtle font-mono">{c.cohortId}</p>
                    </td>
                    <td className="py-2 pr-3 font-mono text-[11px]">{c.irbApprovalNumber}</td>
                    <td className="py-2 pr-3 text-text-muted">{c.studyDesign}</td>
                    <td className="py-2 pr-3 text-text-muted">{c.scope}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{c.minCellSize}</td>
                    <td className="py-2">
                      <Badge tone={c.status === "active" ? "success" : "neutral"}>{c.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Sample manifest</CardTitle>
          <CardDescription>
            Every export ships with a manifest. This is what would accompany a download for the
            primary cohort above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-surface-muted rounded-md p-3 overflow-x-auto">
            {JSON.stringify(manifest, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card tone="raised">
          <CardHeader>
            <CardTitle>Build a new export</CardTitle>
            <CardDescription>
              Compose dimensions, filters, and small-cell threshold for a fresh manifest.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/ops/research-exports/builder"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent/90"
            >
              Open export builder →
            </Link>
          </CardContent>
        </Card>

        <Card tone="raised">
          <CardHeader>
            <CardTitle>Studies</CardTitle>
            <CardDescription>
              Run a permuted-block randomization for an active double-blind protocol.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/ops/research-exports/studies"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-text text-surface hover:opacity-90"
            >
              Open study allocator →
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
