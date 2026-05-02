import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import {
  CARE_TEAM_TRAINERS,
  WORKOUT_LIBRARY,
  WORKOUT_TEMPLATES,
  EXERCISE_LOG_DEMO,
  DEFAULT_STEP_GOAL,
  suggestWorkouts,
  summarizeWeek,
  templateById,
  type Workout,
  type WorkoutTemplate,
  type CareTeamTrainer,
  type ExerciseLogEntry,
} from "@/lib/lifestyle/fitness";

export const metadata = { title: "Fitness" };

export default async function FitnessPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: {
      outcomeLogs: { orderBy: { loggedAt: "desc" }, take: 30 },
      dosingRegimens: { where: { active: true } },
    },
  });

  if (!patient) redirect("/portal/intake");

  const latest = (metric: string): number | undefined => {
    const log = patient.outcomeLogs.find((l) => l.metric === metric);
    return log?.value;
  };

  const suggested = suggestWorkouts({
    latestPain: latest("pain"),
    latestEnergy: latest("energy"),
    hasRegimen: patient.dosingRegimens.length > 0,
  });

  const weekSummary = summarizeWeek(
    EXERCISE_LOG_DEMO,
    new Date(),
    DEFAULT_STEP_GOAL,
  );

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PatientSectionNav section="journey" />
      <PageHeader
        eyebrow="Fitness"
        title="Move on your terms"
        description="Workouts your care team can prescribe, plus credentialed trainers who already know cannabis."
        actions={
          <Link href="/portal/integrations">
            <Button variant="secondary">Sync wearable</Button>
          </Link>
        }
      />

      {/* Weekly summary + step goal */}
      <section className="mb-10">
        <Eyebrow className="mb-3">This week so far</Eyebrow>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <SummaryStat label="Sessions" value={String(weekSummary.sessions)} />
          <SummaryStat
            label="Active minutes"
            value={String(weekSummary.totalMinutes)}
          />
          <SummaryStat
            label="Steps"
            value={weekSummary.totalSteps.toLocaleString()}
            sub={`${Math.round(weekSummary.goalPct * 100)}% of ${weekSummary.goalSteps.toLocaleString()}`}
          />
          <SummaryStat
            label="Avg effort"
            value={`${weekSummary.avgPerceivedExertion}/5`}
          />
        </div>
        <StepGoalBar pct={weekSummary.goalPct} />
      </section>

      <EditorialRule className="mb-10" />

      {/* Recommended for you */}
      <section className="mb-10">
        <Eyebrow className="mb-3">Picked for your week</Eyebrow>
        <p className="text-sm text-text-muted mb-5 max-w-xl">
          Suggestions reflect your recent pain, energy, and dosing pattern.
          Nothing here is medical advice — talk with your care team about new
          activity if you have heart, joint, or balance concerns.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {suggested.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} highlighted />
          ))}
        </div>
      </section>

      <EditorialRule className="mb-10" />

      {/* Trainer roster */}
      <section className="mb-10">
        <Eyebrow className="mb-3">Care-team trainers</Eyebrow>
        <p className="text-sm text-text-muted mb-5 max-w-xl">
          Trainers and physical therapists vetted by Leafjourney. They share
          notes with your prescribing clinician so movement and dosing stay in
          sync.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {CARE_TEAM_TRAINERS.map((trainer) => (
            <TrainerCard key={trainer.id} trainer={trainer} />
          ))}
        </div>
      </section>

      <EditorialRule className="mb-10" />

      {/* Templates */}
      <section className="mb-10">
        <Eyebrow className="mb-3">Workout templates</Eyebrow>
        <div className="grid gap-3 sm:grid-cols-2">
          {WORKOUT_TEMPLATES.map((tpl) => (
            <TemplateCard key={tpl.id} template={tpl} />
          ))}
        </div>
      </section>

      <EditorialRule className="mb-10" />

      {/* Exercise log */}
      <section className="mb-10">
        <Eyebrow className="mb-3">Recent exercise log</Eyebrow>
        <div className="grid gap-2">
          {EXERCISE_LOG_DEMO.map((entry) => (
            <ExerciseLogRow key={entry.id} entry={entry} />
          ))}
        </div>
      </section>

      <EditorialRule className="mb-10" />

      {/* Library */}
      <section className="mb-4">
        <Eyebrow className="mb-3">Full library</Eyebrow>
        <div className="grid gap-3">
          {WORKOUT_LIBRARY.map((w) => (
            <WorkoutRow key={w.id} workout={w} />
          ))}
        </div>
      </section>

      <p className="mt-8 text-xs text-text-subtle text-center">
        Need a referral to physical therapy or a sports medicine specialist?{" "}
        <Link href="/portal/messages" className="text-accent hover:underline">
          Message your care team
        </Link>
        .
      </p>
    </PageShell>
  );
}

function WorkoutCard({
  workout,
  highlighted = false,
}: {
  workout: Workout;
  highlighted?: boolean;
}) {
  return (
    <Card tone={highlighted ? "raised" : "default"}>
      <CardContent className="py-5">
        <div className="flex items-start gap-3 mb-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-2xl"
            aria-hidden="true"
          >
            {workout.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base text-text tracking-tight">
              {workout.title}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <Badge tone="neutral" className="text-[10px] capitalize">
                {workout.focus}
              </Badge>
              <Badge tone="info" className="text-[10px] capitalize">
                {workout.level}
              </Badge>
              <Badge tone="accent" className="text-[10px]">
                {workout.durationMin} min
              </Badge>
              {workout.cannabisFriendly && (
                <Badge tone="success" className="text-[10px]">
                  Post-dose ok
                </Badge>
              )}
            </div>
          </div>
        </div>
        <p className="text-sm text-text-muted leading-relaxed mb-3">
          {workout.description}
        </p>
        <ol className="text-sm text-text-muted space-y-1 list-decimal list-inside">
          {workout.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function WorkoutRow({ workout }: { workout: Workout }) {
  return (
    <details className="group rounded-xl border border-border bg-surface-raised shadow-sm overflow-hidden">
      <summary className="flex items-center gap-4 px-4 py-3 cursor-pointer list-none">
        <span className="text-2xl shrink-0" aria-hidden="true">
          {workout.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text">{workout.title}</p>
          <p className="text-xs text-text-subtle mt-0.5 capitalize">
            {workout.focus} · {workout.level} · {workout.durationMin} min
          </p>
        </div>
        <span
          className="text-text-subtle text-xs transition-transform group-open:rotate-90"
          aria-hidden="true"
        >
          {"▶"}
        </span>
      </summary>
      <div className="px-5 pb-5 pt-1 text-sm text-text-muted leading-relaxed border-t border-border/60">
        <p className="mb-2">{workout.description}</p>
        <ol className="space-y-1 list-decimal list-inside">
          {workout.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </details>
  );
}

function TrainerCard({ trainer }: { trainer: CareTeamTrainer }) {
  return (
    <Card tone="raised">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-muted text-2xl">
            {trainer.avatarEmoji}
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base">{trainer.name}</CardTitle>
            <p className="text-xs text-text-subtle mt-0.5">{trainer.credentials}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-muted leading-relaxed mb-3">
          {trainer.bio}
        </p>
        <div className="flex flex-wrap gap-1 mb-4">
          {trainer.specialties.map((s) => (
            <Badge key={s} tone="neutral" className="text-[10px]">
              {s}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            {trainer.modality.map((m) => (
              <Badge key={m} tone="info" className="text-[10px] capitalize">
                {m}
              </Badge>
            ))}
          </div>
          {trainer.acceptingNew ? (
            <Link href={`/portal/messages?topic=trainer-${trainer.id}`}>
              <Button size="sm">Request session</Button>
            </Link>
          ) : (
            <Badge tone="warning" className="text-[10px]">
              Waitlist only
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised shadow-sm px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-text-subtle">{label}</p>
      <p className="font-display text-xl text-text mt-1 leading-none">{value}</p>
      {sub && <p className="text-[10px] text-text-subtle mt-1">{sub}</p>}
    </div>
  );
}

function StepGoalBar({ pct }: { pct: number }) {
  const width = Math.max(0, Math.min(100, pct * 100));
  return (
    <div>
      <div
        className="h-2 rounded-full bg-surface-muted overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="h-full bg-accent transition-all duration-500"
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="text-[11px] text-text-subtle mt-2">
        Step goal {Math.round(width)}%
      </p>
    </div>
  );
}

function TemplateCard({ template }: { template: WorkoutTemplate }) {
  const tpl = templateById(template.id) ?? template;
  const workouts = tpl.workoutIds
    .map((id) => WORKOUT_LIBRARY.find((w) => w.id === id))
    .filter((w): w is Workout => Boolean(w));
  return (
    <Card tone="raised">
      <CardContent className="py-5">
        <div className="flex items-center gap-2 mb-2">
          <Badge tone="accent" className="text-[10px] capitalize">
            {tpl.focus}
          </Badge>
          <h3 className="font-display text-base text-text tracking-tight">
            {tpl.title}
          </h3>
        </div>
        <p className="text-sm text-text-muted leading-relaxed mb-3">
          {tpl.cadenceDescription}
        </p>
        <ul className="space-y-1 text-sm text-text-muted">
          {workouts.map((w) => (
            <li key={w.id}>
              <span aria-hidden="true">{w.emoji}</span> {w.title} · {w.durationMin} min
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ExerciseLogRow({ entry }: { entry: ExerciseLogEntry }) {
  const workout = entry.workoutId
    ? WORKOUT_LIBRARY.find((w) => w.id === entry.workoutId)
    : undefined;
  const title = workout?.title ?? entry.customLabel ?? "Custom exercise";
  return (
    <div className="rounded-xl border border-border bg-surface-raised shadow-sm px-4 py-3 flex items-start gap-3">
      <span className="text-2xl shrink-0" aria-hidden="true">
        {workout?.emoji ?? "\u{1F3CB}"}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-medium text-text">{title}</p>
          <span className="text-[11px] text-text-subtle">
            {new Date(entry.occurredAt).toLocaleDateString()}
          </span>
        </div>
        <p className="text-[11px] text-text-subtle mt-0.5">
          {entry.durationMin} min · effort {entry.perceivedExertion}/5
          {entry.steps != null ? ` · ${entry.steps.toLocaleString()} steps` : ""}
        </p>
        {entry.notes && (
          <p className="text-xs text-text-muted mt-1 leading-relaxed">{entry.notes}</p>
        )}
      </div>
    </div>
  );
}
