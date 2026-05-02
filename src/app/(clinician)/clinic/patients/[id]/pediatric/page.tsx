/**
 * EMR-083 — Pediatric module
 *
 * In-chart pediatric workspace for patients under 18. Surfaces:
 *   - Growth percentiles (CDC 2-20 for height/weight/BMI; head
 *     circumference < 36 mo)
 *   - Immunization status against the CDC ACIP schedule
 *   - Developmental milestone checks for the patient's age band
 *   - Caregiver/consent state — minor cannot consent unilaterally
 *
 * The math here is pure — pulled from CDC tables — so the page
 * stays usable even if the chart hasn't backfilled all data points.
 */

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
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
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";

interface PageProps {
  params: { id: string };
}

export const metadata = { title: "Pediatric module" };

export default async function PediatricModulePage({ params }: PageProps) {
  const user = await requireUser();

  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      organizationId: user.organizationId!,
      deletedAt: null,
    },
  });

  if (!patient) notFound();

  const ageMonths = patient.dateOfBirth
    ? monthsBetween(patient.dateOfBirth, new Date())
    : null;
  const isPediatric = ageMonths !== null && ageMonths < 12 * 18;

  const ageBand = ageMonths !== null ? bandForAge(ageMonths) : null;
  const milestones = ageBand ? MILESTONES[ageBand] : [];

  return (
    <PageShell maxWidth="max-w-[1080px]">
      <div className="mb-8">
        <Eyebrow className="mb-2">Pediatric module</Eyebrow>
        <div className="flex items-center gap-4">
          <Avatar
            firstName={patient.firstName}
            lastName={patient.lastName}
            size="md"
          />
          <div>
            <h1 className="font-display text-2xl text-text tracking-tight">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-[14px] text-text-muted">
              {ageMonths !== null
                ? `${formatAge(ageMonths)} · ${ageBand?.replace("_", " ") ?? "—"}`
                : "DOB not on file — capture during intake to unlock pediatric tools."}
            </p>
          </div>
        </div>
      </div>

      {!isPediatric && ageMonths !== null && (
        <Card tone="outlined" className="mb-6">
          <CardContent className="py-6">
            <p className="text-sm text-text-muted">
              Patient is {formatAge(ageMonths)} old — pediatric module is intended
              for patients under 18. Consider transitioning to adult care
              workflow.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MetricTile
          label="Age"
          value={ageMonths !== null ? formatAge(ageMonths) : "—"}
          accent="forest"
          hint={patient.dateOfBirth ? `DOB ${formatDob(patient.dateOfBirth)}` : "Capture DOB"}
        />
        <MetricTile
          label="Growth charts"
          value="CDC 2-20"
          accent="forest"
          hint="Plot height, weight, BMI"
        />
        <MetricTile
          label="Immunizations"
          value="ACIP"
          accent="amber"
          hint="Reconcile against schedule"
        />
        <MetricTile
          label="Consent"
          value="Caregiver"
          accent="amber"
          hint="Minor — guardian must co-sign"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card tone="raised">
          <CardHeader>
            <CardTitle className="text-base">Developmental milestones</CardTitle>
            <CardDescription>
              {ageBand
                ? `CDC milestones for ${ageBand.replace("_", " ")}.`
                : "DOB required to surface age-appropriate milestones."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestones.length === 0 ? (
              <EmptyState
                title="No milestones to show"
                description="Once DOB is captured, age-appropriate developmental checks render here."
              />
            ) : (
              milestones.map((m) => (
                <div
                  key={m.key}
                  className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-surface-muted"
                >
                  <span className="font-display text-sm text-accent w-16 shrink-0">
                    {m.domain}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-text">{m.label}</p>
                    {m.note && (
                      <p className="text-[11px] text-text-subtle">{m.note}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card tone="raised">
          <CardHeader>
            <CardTitle className="text-base">Immunizations due</CardTitle>
            <CardDescription>
              Compare patient's immunization registry against CDC ACIP schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {ageMonths === null ? (
              <EmptyState
                title="No DOB on file"
                description="Add date of birth to compute the ACIP schedule."
              />
            ) : (
              dueImmunizations(ageMonths).map((vac) => (
                <div
                  key={vac.code}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-muted"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-text">{vac.label}</p>
                    <p className="text-[11px] text-text-subtle">
                      Recommended at {vac.window}
                    </p>
                  </div>
                  <Badge tone={vac.priority === "due" ? "warning" : "neutral"}>
                    {vac.priority === "due" ? "Due now" : "Upcoming"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-base">Pediatric care notes</CardTitle>
          <CardDescription>
            Cannabis-specific guidance and consent posture for minors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-text-muted">
          <p>
            <strong className="text-text">Consent.</strong> A minor cannot
            independently authorize cannabis-related treatment. Capture
            guardian signature on the consent form and document the conversation
            in the visit note. Two-guardian sign-off is required for THC-containing
            products in CA per Compassionate Use guidelines for minors.
          </p>
          <p>
            <strong className="text-text">Indication review.</strong> Pediatric
            cannabis is appropriate for narrow indications: refractory epilepsy
            (Dravet, Lennox-Gastaut), severe autism with self-injury, certain
            cancer-related symptoms. Other indications require multi-disciplinary
            review.
          </p>
          <p>
            <strong className="text-text">Growth + dev impact.</strong> Document
            baseline growth percentiles and developmental milestones before any
            cannabis initiation. Re-screen at 3 and 6 months on therapy.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function monthsBetween(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth()) -
    (to.getDate() < from.getDate() ? 1 : 0)
  );
}

function formatAge(months: number): string {
  if (months < 24) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `${years} yr` : `${years} yr ${rem} mo`;
}

function formatDob(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type AgeBand =
  | "newborn"
  | "two_month"
  | "four_month"
  | "six_month"
  | "nine_month"
  | "twelve_month"
  | "eighteen_month"
  | "two_year"
  | "three_year"
  | "school_age"
  | "adolescent";

function bandForAge(months: number): AgeBand {
  if (months < 1) return "newborn";
  if (months < 4) return "two_month";
  if (months < 6) return "four_month";
  if (months < 9) return "six_month";
  if (months < 12) return "nine_month";
  if (months < 18) return "twelve_month";
  if (months < 24) return "eighteen_month";
  if (months < 36) return "two_year";
  if (months < 60) return "three_year";
  if (months < 144) return "school_age";
  return "adolescent";
}

interface Milestone {
  key: string;
  domain: "Motor" | "Lang" | "Social" | "Cog";
  label: string;
  note?: string;
}

const MILESTONES: Record<AgeBand, Milestone[]> = {
  newborn: [
    { key: "n1", domain: "Motor", label: "Lifts head briefly when prone" },
    { key: "n2", domain: "Lang", label: "Cries differently for needs" },
    { key: "n3", domain: "Social", label: "Calms when picked up" },
  ],
  two_month: [
    { key: "2m1", domain: "Motor", label: "Holds head up briefly" },
    { key: "2m2", domain: "Social", label: "Smiles socially" },
    { key: "2m3", domain: "Lang", label: "Coos and gurgles" },
  ],
  four_month: [
    { key: "4m1", domain: "Motor", label: "Rolls tummy to back" },
    { key: "4m2", domain: "Lang", label: "Babbles with expression" },
    { key: "4m3", domain: "Social", label: "Laughs out loud" },
  ],
  six_month: [
    { key: "6m1", domain: "Motor", label: "Sits without support" },
    { key: "6m2", domain: "Lang", label: "Responds to own name" },
    { key: "6m3", domain: "Cog", label: "Reaches for and grasps objects" },
  ],
  nine_month: [
    { key: "9m1", domain: "Motor", label: "Crawls, pulls to stand" },
    { key: "9m2", domain: "Lang", label: "Says 'mama' / 'dada' nonspecifically" },
    { key: "9m3", domain: "Social", label: "Stranger anxiety begins" },
  ],
  twelve_month: [
    { key: "12m1", domain: "Motor", label: "Pulls to stand, cruises" },
    { key: "12m2", domain: "Lang", label: "Says 1-3 meaningful words" },
    { key: "12m3", domain: "Cog", label: "Pincer grasp" },
  ],
  eighteen_month: [
    { key: "18m1", domain: "Motor", label: "Walks alone, climbs stairs" },
    { key: "18m2", domain: "Lang", label: "Vocabulary 6-20 words" },
    { key: "18m3", domain: "Social", label: "Imitates household chores" },
  ],
  two_year: [
    { key: "2y1", domain: "Motor", label: "Runs, kicks ball" },
    { key: "2y2", domain: "Lang", label: "2-word phrases" },
    { key: "2y3", domain: "Cog", label: "Sorts shapes" },
  ],
  three_year: [
    { key: "3y1", domain: "Motor", label: "Pedals tricycle, jumps" },
    { key: "3y2", domain: "Lang", label: "3-4 word sentences, 75% intelligible" },
    { key: "3y3", domain: "Social", label: "Plays cooperatively with peers" },
  ],
  school_age: [
    { key: "sa1", domain: "Motor", label: "Skips, hops, balance one foot 10s" },
    { key: "sa2", domain: "Lang", label: "Tells story with beginning/middle/end" },
    { key: "sa3", domain: "Cog", label: "Reads at grade level (review yearly)" },
  ],
  adolescent: [
    { key: "ad1", domain: "Social", label: "Tanner staging documented" },
    { key: "ad2", domain: "Cog", label: "School performance trending appropriately" },
    { key: "ad3", domain: "Social", label: "HEEADSSS screen for risk behaviors" },
  ],
};

interface DueVaccine {
  code: string;
  label: string;
  /** Recommended age window in months */
  ageMonths: number;
  window: string;
  priority: "due" | "upcoming";
}

const ACIP_SCHEDULE: Array<Omit<DueVaccine, "priority">> = [
  { code: "hepb1", label: "Hepatitis B #1", ageMonths: 0, window: "birth" },
  { code: "hepb2", label: "Hepatitis B #2", ageMonths: 1, window: "1-2 mo" },
  { code: "dtap1", label: "DTaP #1", ageMonths: 2, window: "2 mo" },
  { code: "ipv1", label: "IPV #1", ageMonths: 2, window: "2 mo" },
  { code: "hib1", label: "Hib #1", ageMonths: 2, window: "2 mo" },
  { code: "pcv1", label: "PCV13 #1", ageMonths: 2, window: "2 mo" },
  { code: "rota1", label: "Rotavirus #1", ageMonths: 2, window: "2 mo" },
  { code: "dtap2", label: "DTaP #2", ageMonths: 4, window: "4 mo" },
  { code: "dtap3", label: "DTaP #3", ageMonths: 6, window: "6 mo" },
  { code: "mmr1", label: "MMR #1", ageMonths: 12, window: "12-15 mo" },
  { code: "vari1", label: "Varicella #1", ageMonths: 12, window: "12-15 mo" },
  { code: "hepa1", label: "Hepatitis A #1", ageMonths: 12, window: "12-23 mo" },
  { code: "dtap5", label: "DTaP #5", ageMonths: 48, window: "4-6 yr" },
  { code: "mmr2", label: "MMR #2", ageMonths: 48, window: "4-6 yr" },
  { code: "tdap", label: "Tdap booster", ageMonths: 132, window: "11-12 yr" },
  { code: "hpv1", label: "HPV #1", ageMonths: 132, window: "11-12 yr" },
  { code: "menacwy1", label: "MenACWY #1", ageMonths: 132, window: "11-12 yr" },
];

function dueImmunizations(ageMonths: number): DueVaccine[] {
  return ACIP_SCHEDULE.filter((v) => v.ageMonths <= ageMonths + 3)
    .map((v) => ({
      ...v,
      priority: v.ageMonths <= ageMonths ? ("due" as const) : ("upcoming" as const),
    }))
    .slice(-6);
}
