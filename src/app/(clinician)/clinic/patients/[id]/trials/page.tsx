import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Eyebrow, LeafSprig, EditorialRule } from "@/components/ui/ornament";

interface PageProps {
  params: { id: string };
}

export const metadata = { title: "Clinical Trial Matching" };

// Demo trials — in production, these would come from ClinicalTrials.gov API
const DEMO_TRIALS = [
  {
    id: "NCT05012345",
    title:
      "A Randomized, Double-Blind Study of THC:CBD (1:1) vs Placebo for Chronic Neuropathic Pain",
    phase: "Phase III",
    status: "Recruiting",
    sponsor: "University of Colorado Health",
    conditions: ["Chronic pain", "Neuropathic pain"],
    interventions: ["THC:CBD 1:1 sublingual spray", "Placebo"],
    eligibility:
      "Adults 18-75 with chronic neuropathic pain lasting >3 months. Must have tried at least 2 conventional therapies.",
    distance: "12 miles",
    matchScore: 92,
    matchReason:
      "Patient has chronic pain as presenting concern and has documented prior conventional therapy attempts.",
    url: "https://clinicaltrials.gov/ct2/show/NCT05012345",
  },
  {
    id: "NCT05067890",
    title:
      "Cannabis-Based Medicine for Anxiety Disorders: A Multi-Center RCT",
    phase: "Phase II",
    status: "Recruiting",
    sponsor: "Mayo Clinic",
    conditions: ["Generalized anxiety disorder", "Social anxiety"],
    interventions: ["CBD 300mg/day oral", "THC:CBD 5:20 sublingual"],
    eligibility:
      "Adults 21-65 with GAD or SAD diagnosed via DSM-5. GAD-7 score >= 10 at screening.",
    distance: "45 miles",
    matchScore: 78,
    matchReason:
      "Patient's presenting concerns include anxiety. GAD assessment data available.",
    url: "https://clinicaltrials.gov/ct2/show/NCT05067890",
  },
  {
    id: "NCT05098765",
    title:
      "Cannabidiol for Insomnia in Adults: A Dose-Finding Study",
    phase: "Phase II",
    status: "Not yet recruiting",
    sponsor: "National Institutes of Health",
    conditions: ["Insomnia", "Sleep disorders"],
    interventions: ["CBD 50mg", "CBD 150mg", "CBD 300mg", "Placebo"],
    eligibility:
      "Adults 18-65 with chronic insomnia per ICSD-3. Pittsburgh Sleep Quality Index >5.",
    distance: "28 miles",
    matchScore: 65,
    matchReason:
      "Patient has reported sleep-related outcomes. May meet eligibility criteria.",
    url: "https://clinicaltrials.gov/ct2/show/NCT05098765",
  },
];

export default async function TrialsPage({ params }: PageProps) {
  const user = await requireUser();

  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      organizationId: user.organizationId!,
      deletedAt: null,
    },
  });

  if (!patient) notFound();

  return (
    <PageShell maxWidth="max-w-[1080px]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Avatar
            firstName={patient.firstName}
            lastName={patient.lastName}
            size="lg"
          />
          <div>
            <Eyebrow className="mb-2">Clinical Trial Matching</Eyebrow>
            <h1 className="font-display text-2xl text-text tracking-tight">
              Trials for {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              AI-matched clinical trials based on patient data and eligibility criteria.
            </p>
          </div>
        </div>
        <Link href={`/clinic/patients/${params.id}`}>
          <Button variant="secondary" size="sm">
            Back to chart
          </Button>
        </Link>
      </div>

      {/* Match summary */}
      <Card tone="ambient" className="mb-8">
        <CardContent className="py-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-display text-3xl text-accent">
                {DEMO_TRIALS.length}
              </p>
              <p className="text-xs text-text-muted mt-1">Potential matches</p>
            </div>
            <div>
              <p className="font-display text-3xl text-text">
                {DEMO_TRIALS.filter((t) => t.status === "Recruiting").length}
              </p>
              <p className="text-xs text-text-muted mt-1">Currently recruiting</p>
            </div>
            <div>
              <p className="font-display text-3xl text-text">
                {DEMO_TRIALS[0].matchScore}%
              </p>
              <p className="text-xs text-text-muted mt-1">Best match score</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditorialRule className="mb-8" />

      {/* Trial cards */}
      <div className="space-y-6">
        {DEMO_TRIALS.map((trial) => (
          <Card key={trial.id} tone="raised" className="card-hover">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge tone="accent">{trial.phase}</Badge>
                    <Badge
                      tone={
                        trial.status === "Recruiting" ? "success" : "warning"
                      }
                    >
                      {trial.status}
                    </Badge>
                    <Badge tone="neutral">{trial.distance} away</Badge>
                  </div>
                  <CardTitle className="text-base leading-snug">
                    {trial.title}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {trial.sponsor} &middot; {trial.id}
                  </CardDescription>
                </div>
                {/* Match score circle */}
                <div className="shrink-0 flex flex-col items-center">
                  <div
                    className={`h-14 w-14 rounded-full flex items-center justify-center text-white font-display text-lg ${
                      trial.matchScore >= 80
                        ? "bg-accent"
                        : trial.matchScore >= 60
                          ? "bg-highlight"
                          : "bg-border-strong"
                    }`}
                  >
                    {trial.matchScore}
                  </div>
                  <span className="text-[10px] text-text-subtle mt-1">
                    match
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text-subtle mb-1">
                    Conditions
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {trial.conditions.map((c) => (
                      <Badge key={c} tone="neutral" className="text-[10px]">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text-subtle mb-1">
                    Interventions
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {trial.interventions.map((i) => (
                      <Badge key={i} tone="accent" className="text-[10px]">
                        {i}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-wider text-text-subtle mb-1">
                  Eligibility
                </p>
                <p className="text-sm text-text-muted leading-relaxed">
                  {trial.eligibility}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                <p className="text-xs font-medium text-accent mb-0.5">
                  AI Match Rationale
                </p>
                <p className="text-sm text-text-muted leading-relaxed">
                  {trial.matchReason}
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-[10px] text-text-subtle italic">
                Trial information sourced from ClinicalTrials.gov. Eligibility
                must be confirmed by the study team.
              </p>
              <div className="ml-auto flex gap-2">
                <Button variant="secondary" size="sm">
                  Send to patient
                </Button>
                <a
                  href={trial.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm">
                    View on ClinicalTrials.gov
                  </Button>
                </a>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
