import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";
import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import { HealthPlant } from "@/components/ui/health-plant";
import {
  computePlantHealth,
  STAGE_LABELS,
  STAGE_DESCRIPTIONS,
  STAGE_ENCOURAGEMENT,
} from "@/lib/domain/plant-health";

export const metadata = { title: "My Garden" };

export default async function GardenPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, firstName: true },
  });

  if (!patient) {
    redirect("/portal/intake");
  }

  const health = await computePlantHealth(patient.id);

  const positiveFactors = health.healthFactors.filter(
    (f) => f.status === "positive",
  );
  const neutralFactors = health.healthFactors.filter(
    (f) => f.status === "neutral",
  );
  const negativeFactors = health.healthFactors.filter(
    (f) => f.status === "negative",
  );

  return (
    <PageShell maxWidth="max-w-[860px]">
      {/* ---- Hero section ---- */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface-raised ambient mb-10">
        <div className="relative flex flex-col items-center text-center px-8 py-14 md:py-20">
          <Eyebrow className="mb-6">Your garden</Eyebrow>

          <HealthPlant health={health} size="lg" />

      <PatientSectionNav section="journey" />
          <h1 className="font-display text-3xl md:text-4xl leading-[1.1] tracking-tight text-text mt-8">
            {STAGE_LABELS[health.stage]}
          </h1>
          <p className="text-[15px] text-text-muted mt-3 leading-relaxed max-w-md">
            {STAGE_DESCRIPTIONS[health.stage]}
          </p>

          {/* Score badge */}
          <div className="mt-5 flex items-center gap-3">
            <Badge
              tone={
                health.score >= 71
                  ? "success"
                  : health.score >= 40
                    ? "accent"
                    : "warning"
              }
            >
              Health score: {health.score}
            </Badge>
            <Badge tone="neutral">{health.leafCount} leaves</Badge>
            {health.hasFlowers && (
              <Badge tone="highlight">Blooming</Badge>
            )}
          </div>

          {/* Encouragement */}
          <p className="text-sm text-text-subtle mt-4 italic max-w-sm">
            {STAGE_ENCOURAGEMENT[health.stage]}
          </p>
        </div>
      </section>

      <EditorialRule className="mb-10" />

      {/* ---- Health factors ---- */}
      <section className="mb-10">
        <h2 className="font-display text-xl text-text tracking-tight mb-6">
          What&apos;s helping your plant grow
        </h2>

        {positiveFactors.length > 0 ? (
          <div className="grid gap-3 mb-6">
            {positiveFactors.map((f) => (
              <FactorRow key={f.label} factor={f} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted mb-6">
            No positive factors yet. Start by logging how you feel today.
          </p>
        )}

        {(neutralFactors.length > 0 || negativeFactors.length > 0) && (
          <>
            <h2 className="font-display text-xl text-text tracking-tight mb-6 mt-8">
              Where your plant needs attention
            </h2>
            <div className="grid gap-3">
              {negativeFactors.map((f) => (
                <FactorRow key={f.label} factor={f} />
              ))}
              {neutralFactors.map((f) => (
                <FactorRow key={f.label} factor={f} />
              ))}
            </div>
          </>
        )}
      </section>

      <EditorialRule className="mb-10" />

      {/* ---- Tips ---- */}
      <section className="mb-10">
        <h2 className="font-display text-xl text-text tracking-tight mb-6">
          Ways to help your plant grow
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TipCard
            title="Log a check-in"
            description="Tell us how you're feeling. Pain, sleep, mood — even a quick entry makes a difference."
            href="/portal/outcomes"
            cta="Log now"
          />
          <TipCard
            title="Complete an assessment"
            description="Structured questionnaires help your care team fine-tune your plan."
            href="/portal/assessments"
            cta="Take assessment"
          />
          <TipCard
            title="Message your team"
            description="A quick note to your care team counts as tending to your health."
            href="/portal/messages"
            cta="Send message"
          />
          <TipCard
            title="Finish your intake"
            description="A complete chart gives your plant deeper roots and stronger stems."
            href="/portal/intake"
            cta="Continue intake"
          />
        </div>
      </section>

      {/* ---- Back to portal ---- */}
      <div className="flex justify-center">
        <Link href="/portal">
          <Button variant="secondary">Back to home</Button>
        </Link>
      </div>
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FactorRow({
  factor,
}: {
  factor: { label: string; status: "positive" | "neutral" | "negative"; detail: string };
}) {
  const badgeTone =
    factor.status === "positive"
      ? "success"
      : factor.status === "negative"
        ? "warning"
        : "neutral";

  const icon =
    factor.status === "positive"
      ? "\u2714" // checkmark
      : factor.status === "negative"
        ? "\u25CB" // circle
        : "\u2014"; // em dash

  return (
    <div className="flex items-start gap-4 bg-surface-raised border border-border rounded-xl p-4 shadow-sm">
      <span
        className={cn(
          "mt-0.5 text-sm shrink-0",
          factor.status === "positive" && "text-success",
          factor.status === "negative" && "text-[color:var(--warning)]",
          factor.status === "neutral" && "text-text-subtle",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text">{factor.label}</p>
          <Badge tone={badgeTone} className="text-[10px]">
            {factor.status}
          </Badge>
        </div>
        <p className="text-sm text-text-muted mt-1 leading-relaxed">
          {factor.detail}
        </p>
      </div>
    </div>
  );
}

function TipCard({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <Card tone="raised" className="card-hover">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-muted leading-relaxed mb-4">
          {description}
        </p>
        <Link href={href}>
          <Button size="sm" variant="secondary">
            {cta}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

