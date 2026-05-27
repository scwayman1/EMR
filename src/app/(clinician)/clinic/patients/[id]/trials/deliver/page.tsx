// EMR-058 — Trial auto-recommendation delivery preview.
//
// Drills into a single trial match for a patient and renders the
// rendered delivery payload for each opted-in channel — portal,
// email, SMS. The clinician reviews the payload and confirms send;
// `chooseChannels` decides which channels are honored.

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildDeliveryPayload,
  checkEligibility,
  chooseChannels,
  type DeliveryChannel,
  type PatientFacts,
  type TrialRecord,
} from "@/lib/clinical/trial-delivery";

interface PageProps {
  params: { id: string };
  searchParams: { nct?: string };
}

export const metadata = { title: "Trial delivery preview" };

// Same demo trials as the matching page until we wire ClinicalTrials.gov.
const DEMO_TRIALS: TrialRecord[] = [
  {
    nct: "NCT05012345",
    title:
      "A Randomized, Double-Blind Study of THC:CBD (1:1) vs Placebo for Chronic Neuropathic Pain",
    phase: "Phase III",
    status: "Recruiting",
    sponsor: "University of Colorado Health",
    conditions: ["chronic pain", "neuropathic pain"],
    interventions: ["THC:CBD 1:1 sublingual spray", "placebo"],
    minimumAge: 18,
    maximumAge: 75,
    sex: "any",
    inclusions: ["chronic neuropathic pain", "prior conventional therapy"],
    exclusions: ["history of psychosis", "pregnancy", "active substance use"],
    url: "https://clinicaltrials.gov/ct2/show/NCT05012345",
  },
  {
    nct: "NCT05067890",
    title: "Cannabis-Based Medicine for Anxiety Disorders: Multi-Center RCT",
    phase: "Phase II",
    status: "Recruiting",
    sponsor: "Mayo Clinic",
    conditions: ["generalized anxiety disorder", "social anxiety"],
    interventions: ["CBD 300mg/day oral", "THC:CBD 5:20 sublingual"],
    minimumAge: 21,
    maximumAge: 65,
    sex: "any",
    inclusions: ["GAD-7 score >= 10"],
    exclusions: ["bipolar disorder", "current psychotic features"],
    url: "https://clinicaltrials.gov/ct2/show/NCT05067890",
  },
  {
    nct: "NCT05098765",
    title: "Cannabidiol for Insomnia in Adults: A Dose-Finding Study",
    phase: "Phase II",
    status: "Not yet recruiting",
    sponsor: "National Institutes of Health",
    conditions: ["insomnia"],
    interventions: ["CBD 50mg", "CBD 150mg", "CBD 300mg", "placebo"],
    minimumAge: 18,
    maximumAge: 65,
    sex: "any",
    inclusions: ["chronic insomnia per ICSD-3", "Pittsburgh Sleep Quality Index >5"],
    exclusions: ["untreated OSA", "active substance use disorder"],
    url: "https://clinicaltrials.gov/ct2/show/NCT05098765",
  },
];

const CHANNEL_TONE: Record<DeliveryChannel, "accent" | "success" | "info"> = {
  portal: "accent",
  email: "success",
  sms: "info",
};

export default async function TrialDeliveryPage({
  params,
  searchParams,
}: PageProps) {
  const user = await requireUser();
  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      organizationId: user.organizationId!,
      deletedAt: null,
    },
  });
  if (!patient) notFound();

  const trial =
    DEMO_TRIALS.find((t) => t.nct === searchParams.nct) ?? DEMO_TRIALS[0];

  const age =
    patient.dateOfBirth
      ? Math.floor(
          (Date.now() - new Date(patient.dateOfBirth).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        )
      : 45;

  const patientFacts: PatientFacts = {
    patientId: patient.id,
    firstName: patient.firstName ?? "there",
    age,
    sex: "other",
    conditions: [
      "chronic neuropathic pain",
      "generalized anxiety disorder",
    ],
    currentMeds: ["gabapentin", "sertraline"],
    readingBand: "grade_8",
    optInChannels: ["portal", "email", "sms"],
  };

  const eligibility = checkEligibility(patientFacts, trial);
  const channels = chooseChannels(patientFacts);
  const payloads = channels.map((c) =>
    buildDeliveryPayload(c, patientFacts, trial, eligibility),
  );

  const verdictTone =
    eligibility.verdict === "eligible"
      ? "success"
      : eligibility.verdict === "likely_eligible"
        ? "info"
        : eligibility.verdict === "unknown"
          ? "neutral"
          : "warning";

  return (
    <PageShell maxWidth="max-w-[1120px]">
      <PageHeader
        eyebrow="Trial delivery"
        title={`Send trial match to ${patient.firstName} ${patient.lastName}`}
        description="Preview the eligibility verdict and the rendered payload for each opted-in channel. The clinician reviews and confirms send."
        actions={
          <Link href={`/clinic/patients/${params.id}/trials`}>
            <Button variant="secondary" size="sm">
              ← Back to trials
            </Button>
          </Link>
        }
      />

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>{trial.title}</CardTitle>
          <CardDescription>
            {trial.sponsor} · {trial.phase} · {trial.status} ·{" "}
            <a
              href={trial.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {trial.nct}
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Badge tone={verdictTone as "success" | "info" | "neutral" | "warning"}>
              {eligibility.verdict.replace("_", " ")}
            </Badge>
            <span className="text-sm text-text-muted">
              score {Math.round(eligibility.score * 100)}/100
            </span>
          </div>
          <ul className="text-sm text-text-muted space-y-1">
            {eligibility.reasons.map((r, i) => (
              <li key={i}>· {r}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {DEMO_TRIALS.map((t) => (
          <Link
            key={t.nct}
            href={`/clinic/patients/${params.id}/trials/deliver?nct=${t.nct}`}
            className={[
              "rounded-md border px-3 py-2 text-sm transition-colors",
              t.nct === trial.nct
                ? "border-accent bg-accent/10"
                : "border-border bg-surface hover:bg-surface-muted",
            ].join(" ")}
          >
            <p className="text-text font-medium leading-snug">
              {t.title}
            </p>
            <p className="text-[11px] text-text-subtle font-mono mt-1">
              {t.nct} · {t.phase}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {payloads.map((p) => (
          <Card key={p.channel} tone="raised">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge tone={CHANNEL_TONE[p.channel]}>{p.channel}</Badge>
                <CardTitle className="text-base">
                  {p.channel === "portal"
                    ? "Patient portal"
                    : p.channel === "email"
                      ? "Email"
                      : "Text message"}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {p.subject && (
                <p className="text-xs text-text-subtle uppercase tracking-wider">
                  Subject
                </p>
              )}
              {p.subject && (
                <p className="text-sm text-text mb-3 font-medium">{p.subject}</p>
              )}
              <p className="text-xs text-text-subtle uppercase tracking-wider mt-1">
                Body
              </p>
              <pre className="text-xs text-text whitespace-pre-wrap leading-relaxed bg-surface-muted rounded-md p-3 mt-1">
                {p.body}
              </pre>
              <p className="text-[11px] text-text-subtle mt-2">
                {p.body.length} chars
              </p>
              <Button size="sm" className="mt-3 w-full">
                Send {p.channel}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
