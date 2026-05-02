// EMR-150 — Cannabis Combo Wheel on the patient portal with personalised
// compound suggestions derived from each patient's condition profile.
//
// We render the production ComboWheel component (shared with the public
// education site and the clinician research console) but pre-compute a
// match score for the current patient: any compound whose `symptoms`
// list overlaps with the patient's intake conditions, treatment goals,
// or recent outcome metrics gets surfaced as a personalised starting
// point. This keeps the wheel itself a pure interactive surface while
// still giving each patient a head-start.

import { redirect } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/ornament";
import { ComboWheel } from "@/components/education/ComboWheel";
import { getComboWheelCompounds } from "@/lib/domain/combo-wheel";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import {
  buildPatientComboProfile,
  rankCompoundsForProfile,
} from "@/lib/patient/combo-personalization";

export const metadata = { title: "Cannabis Combo Wheel" };

const RECENT_OUTCOME_DAYS = 30;

export default async function PatientComboWheelPage() {
  const user = await requireRole("patient");

  const [patient, compounds] = await Promise.all([
    prisma.patient.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        firstName: true,
        presentingConcerns: true,
        treatmentGoals: true,
        intakeAnswers: true,
        outcomeLogs: {
          where: {
            loggedAt: {
              gte: new Date(
                Date.now() - RECENT_OUTCOME_DAYS * 24 * 60 * 60 * 1000,
              ),
            },
          },
          orderBy: { loggedAt: "desc" },
          take: 50,
          select: { metric: true, value: true },
        },
        dosingRegimens: {
          where: { active: true },
          select: { id: true },
        },
      },
    }),
    getComboWheelCompounds(),
  ]);

  if (!patient) redirect("/portal/intake");

  const profile = buildPatientComboProfile({
    presentingConcerns: patient.presentingConcerns,
    treatmentGoals: patient.treatmentGoals,
    intakeAnswers: patient.intakeAnswers,
    outcomeLogs: patient.outcomeLogs,
  });

  const ranked = rankCompoundsForProfile(compounds, profile);
  const topMatches = ranked.slice(0, 3);
  const hasProfile = profile.symptoms.length > 0;

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PatientSectionNav section="chatLearn" />
      <div className="mb-8 text-center">
        <Eyebrow className="justify-center mb-3 text-accent">
          Leafjourney Proprietary Tool
        </Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-tight">
          {patient.firstName}&apos;s Combo Wheel
        </h1>
        <p className="text-[15px] text-text-muted mt-3 max-w-xl mx-auto leading-relaxed">
          Tap cannabinoids and terpenes to see how they work together — and how
          they overlap with the symptoms you&apos;ve told us about.
        </p>
      </div>

      {hasProfile && topMatches.length > 0 && (
        <Card tone="ambient" className="mb-6">
          <CardContent className="py-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-accent mb-2">
                  Personalised for your profile
                </p>
                <p className="text-sm text-text leading-relaxed mb-3">
                  Based on what you&apos;ve shared, these compounds may be
                  worth exploring first:
                </p>
                <div className="flex flex-wrap gap-2">
                  {topMatches.map((m) => (
                    <span
                      key={m.compound.id}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                      style={{
                        borderColor: m.compound.color,
                        color: m.compound.color,
                        backgroundColor: `${m.compound.color}14`,
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        aria-hidden
                        style={{ backgroundColor: m.compound.color }}
                      />
                      {m.compound.name}
                      <span className="text-[10px] text-text-subtle font-normal">
                        {m.matched.slice(0, 2).join(", ")}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              <Badge tone="accent" className="shrink-0">
                {profile.symptoms.length} symptom
                {profile.symptoms.length === 1 ? "" : "s"} on file
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <ComboWheel
        context="public"
        showFooter={false}
        initialCompounds={compounds}
      />

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/portal/medications">
          <Card tone="raised" className="card-hover h-full">
            <CardContent className="py-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                Your regimen
              </p>
              <p className="text-sm text-text leading-relaxed">
                {patient.dosingRegimens.length > 0
                  ? `Compare wheel selections with your ${patient.dosingRegimens.length} active regimen${
                      patient.dosingRegimens.length === 1 ? "" : "s"
                    }.`
                  : "Build a regimen from anything that resonates here."}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/portal/messages">
          <Card tone="raised" className="card-hover h-full">
            <CardContent className="py-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                Have a question?
              </p>
              <p className="text-sm text-text leading-relaxed">
                Message your care team to discuss the compounds you&apos;ve
                lined up.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="mt-8 text-center">
        <Link href="/portal/supplement-wheel">
          <Button variant="secondary" size="lg">
            Open the Supplement Wheel
          </Button>
        </Link>
      </div>

      <p className="text-[11px] text-text-subtle mt-10 max-w-2xl mx-auto leading-relaxed text-center">
        This tool is educational. Always discuss any changes to your cannabis
        regimen with your care team before starting.
      </p>
    </PageShell>
  );
}
