import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import { LIFESTYLE_DOMAINS, LIFESTYLE_TIPS } from "@/lib/domain/lifestyle";
import { computePlantHealth } from "@/lib/domain/plant-health";
import {
  buildAchievements,
  consecutiveDayStreak,
} from "@/lib/domain/achievements";
import { WellnessToolkitGrid } from "./toolkit-grid";

export const metadata = { title: "Wellness Toolkit" };

// EMR-191 — Wellness Toolkit redesign
// Replaces the old ribbon-tab interface with a clean, card-based layout:
//  - removed the ribbon nav entirely
//  - checkbox dropdowns by lifestyle category
//  - health score widget integrated at the top of the page
//  - card-based toolkit instead of tabs

export default async function WellnessToolkitPage() {
  const user = await requireRole("patient");
  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: {
      outcomeLogs: { orderBy: { loggedAt: "desc" }, take: 200 },
      messageThreads: { take: 1 },
      chartSummary: true,
      encounters: {
        orderBy: { scheduledFor: "desc" },
        take: 1,
        where: { status: "complete" },
      },
    },
  });
  if (!patient) redirect("/portal/intake");

  const plantHealth = await computePlantHealth(patient.id);
  const consecutiveDays = consecutiveDayStreak(
    patient.outcomeLogs.map((l) => l.loggedAt),
  );
  const uniqueMetrics = new Set(patient.outcomeLogs.map((l) => l.metric)).size;
  const lastVisit = patient.encounters[0]?.completedAt;
  const daysSinceLastVisit = lastVisit
    ? Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const achievements = buildAchievements({
    outcomeLogCount: patient.outcomeLogs.length,
    consecutiveDays,
    uniqueMetricsLogged: uniqueMetrics,
    daysSinceLastVisit,
    hasMessagedTeam: patient.messageThreads.length > 0,
    intakeComplete: patient.chartSummary?.completenessScore ?? 0,
  });
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PatientSectionNav section="journey" />

      {/* Header — clean card, no ribbon */}
      <header className="mb-8">
        <Eyebrow className="mb-3">Wellness toolkit</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
          Pick what you are working on this week.
        </h1>
        <p className="text-[15px] text-text-muted mt-3 leading-relaxed max-w-xl">
          Lifestyle tools, mindfulness, and habit building — organized as
          checkable categories so you can see what is realistic for the next
          seven days.
        </p>
      </header>

      {/* Health score integration widget */}
      <Card tone="ambient" className="mb-8">
        <CardContent className="py-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
            <HealthScoreTile score={plantHealth.score} stage={plantHealth.stage} />
            <ScoreTile
              emoji="\u{1F525}"
              label="Streak"
              value={`${consecutiveDays}`}
              hint={consecutiveDays === 1 ? "day" : "days"}
            />
            <ScoreTile
              emoji="\u{1F3C6}"
              label="Achievements"
              value={`${unlockedCount}/${achievements.length}`}
              hint="unlocked"
            />
            <ScoreTile
              emoji="\u{1F33F}"
              label="Leaves"
              value={`${plantHealth.leafCount}`}
              hint="on your plant"
            />
          </div>
        </CardContent>
      </Card>

      <EditorialRule className="mb-8" />

      {/* Checkbox dropdown by category */}
      <WellnessToolkitGrid
        domains={LIFESTYLE_DOMAINS}
        tips={LIFESTYLE_TIPS}
      />

      <EditorialRule className="my-10" />

      {/* Bottom CTAs */}
      <section className="grid gap-3 sm:grid-cols-3 mb-6">
        <CtaCard
          title="Mindfulness"
          body="Daily emoji check-in across meditation, gratitude, journaling, breathing."
          href="/portal/lifestyle"
          cta="Open"
        />
        <CtaCard
          title="Garden"
          body="Plant health + grow guide + community."
          href="/portal/garden"
          cta="Open"
        />
        <CtaCard
          title="Fitness"
          body="Templates, trainers, and your weekly summary."
          href="/portal/fitness"
          cta="Open"
        />
      </section>

      <p className="text-center text-xs text-text-subtle mt-6">
        <Link href="/portal" className="text-accent hover:underline">
          Back to home
        </Link>
      </p>
    </PageShell>
  );
}

function ScoreTile({
  emoji,
  label,
  value,
  hint,
}: {
  emoji: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-3xl shrink-0" aria-hidden="true">
        {emoji}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.16em] text-text-subtle">
          {label}
        </p>
        <p className="font-display text-2xl text-text leading-none mt-1">
          {value}
        </p>
        <p className="text-[11px] text-text-subtle mt-1">{hint}</p>
      </div>
    </div>
  );
}

function HealthScoreTile({
  score,
  stage,
}: {
  score: number;
  stage: string;
}) {
  const tone =
    score >= 71 ? "success" : score >= 40 ? "accent" : "warning";
  return (
    <div className="flex items-start gap-3">
      <span className="text-3xl shrink-0" aria-hidden="true">
        {"\u{1F343}"}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.16em] text-text-subtle">
          Health score
        </p>
        <p className="font-display text-2xl text-text leading-none mt-1">
          {score}
        </p>
        <Badge tone={tone} className="mt-1.5 text-[10px] capitalize">
          {stage}
        </Badge>
      </div>
    </div>
  );
}

function CtaCard({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Card tone="raised" className="card-hover">
      <CardContent className="py-5">
        <h3 className="font-display text-base text-text tracking-tight mb-1">
          {title}
        </h3>
        <p className="text-sm text-text-muted leading-relaxed mb-4">{body}</p>
        <Link href={href}>
          <Button size="sm" variant="secondary">
            {cta}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
