import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditorialRule, Eyebrow } from "@/components/ui/ornament";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "My Roadmap" };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimelineEvent {
  id: string;
  date: Date;
  label: string;
  detail: string | null;
}

interface Milestone {
  label: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Future pathway SVG — a gentle curve with milestone markers
// ---------------------------------------------------------------------------

function PathwaySvg({
  direction,
  color,
  fillColor,
  milestones,
}: {
  direction: "up" | "down";
  color: string;
  fillColor: string;
  milestones: Milestone[];
}) {
  const width = 600;
  const height = 180;
  const padX = 40;
  const padY = 30;

  // Build a gentle curve: rising or declining
  const startY = direction === "up" ? height - padY : padY + 20;
  const endY = direction === "up" ? padY + 20 : height - padY;
  const midY = (startY + endY) / 2;

  const pathD = [
    `M ${padX} ${startY}`,
    `C ${padX + (width - 2 * padX) * 0.33} ${startY},`,
    `  ${padX + (width - 2 * padX) * 0.5} ${midY},`,
    `  ${padX + (width - 2 * padX) * 0.66} ${endY * 0.7 + startY * 0.3}`,
    `L ${width - padX} ${endY}`,
  ].join(" ");

  // Area fill beneath the curve
  const areaD = `${pathD} L ${width - padX} ${height - 10} L ${padX} ${height - 10} Z`;

  // Distribute milestones along the path
  const count = milestones.length;
  const positions = milestones.map((_, i) => {
    const t = (i + 1) / (count + 1);
    const x = padX + t * (width - 2 * padX);
    // Interpolate Y along the curve (simplified linear interpolation)
    const y = startY + t * (endY - startY);
    return { x, y };
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-[600px]"
      aria-hidden="true"
    >
      {/* Area fill */}
      <path d={areaD} fill={fillColor} opacity={0.15} />

      <PatientSectionNav section="journey" />
      {/* Main curve */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Start dot */}
      <circle
        cx={padX}
        cy={startY}
        r="4"
        fill={color}
        stroke="var(--surface-raised)"
        strokeWidth="2"
      />

      {/* Milestone markers */}
      {positions.map((pos, i) => (
        <g key={i}>
          {/* Vertical tick line */}
          <line
            x1={pos.x}
            y1={pos.y - 8}
            x2={pos.x}
            y2={pos.y + 8}
            stroke={color}
            strokeWidth="1"
            opacity={0.4}
          />
          {/* Dot */}
          <circle
            cx={pos.x}
            cy={pos.y}
            r="5"
            fill={color}
            stroke="var(--surface-raised)"
            strokeWidth="2"
          />
          {/* Label — above for rising, below for declining */}
          <text
            x={pos.x}
            y={direction === "up" ? pos.y - 16 : pos.y + 22}
            textAnchor="middle"
            fill="var(--text)"
            fontSize="11"
            fontWeight="500"
            fontFamily="var(--font-sans)"
          >
            {milestones[i].label}
          </text>
          <text
            x={pos.x}
            y={direction === "up" ? pos.y - 4 : pos.y + 34}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize="9"
            fontFamily="var(--font-sans)"
          >
            {milestones[i].description}
          </text>
        </g>
      ))}

      {/* End dot */}
      <circle
        cx={width - padX}
        cy={endY}
        r="4"
        fill={color}
        stroke="var(--surface-raised)"
        strokeWidth="2"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getRoadmapData(patientId: string) {
  const [encounters, outcomeLogs, regimens, patient] = await Promise.all([
    prisma.encounter.findMany({
      where: { patientId },
      orderBy: { scheduledFor: "asc" },
      select: {
        id: true,
        scheduledFor: true,
        completedAt: true,
        reason: true,
        modality: true,
        status: true,
        createdAt: true,
      },
      take: 20,
    }),
    prisma.outcomeLog.findMany({
      where: { patientId },
      orderBy: { loggedAt: "desc" },
      take: 50,
    }),
    prisma.dosingRegimen.findMany({
      where: { patientId, active: true },
      include: { product: { select: { name: true, productType: true } } },
    }),
    prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        presentingConcerns: true,
        treatmentGoals: true,
      },
    }),
  ]);

  // Build timeline events from encounters
  const timeline: TimelineEvent[] = encounters.map((e) => ({
    id: e.id,
    date: e.scheduledFor ?? e.createdAt,
    label:
      e.status === "complete"
        ? "Visit completed"
        : e.status === "scheduled"
          ? "Upcoming visit"
          : e.status === "in_progress"
            ? "Visit in progress"
            : "Visit cancelled",
    detail: e.reason ?? null,
  }));

  // Latest values per metric
  const latestMetrics: Record<string, number> = {};
  for (const log of outcomeLogs) {
    if (!(log.metric in latestMetrics)) {
      latestMetrics[log.metric] = log.value;
    }
  }

  // Active concerns
  const concerns = patient?.presentingConcerns
    ? patient.presentingConcerns
        .split(/[,;]+/)
        .map((c) => c.trim())
        .filter(Boolean)
    : [];

  // Treatment goals
  const goals = patient?.treatmentGoals?.trim() ?? null;

  // Active regimen summary
  const activeRegimen = regimens.map((r) => ({
    product: r.product.name,
    type: r.product.productType,
    instructions: r.patientInstructions ?? `${r.volumePerDose} ${r.volumeUnit} x${r.frequencyPerDay}/day`,
  }));

  return { timeline, latestMetrics, concerns, goals, activeRegimen };
}

// ---------------------------------------------------------------------------
// Modality label helper
// ---------------------------------------------------------------------------

function modalityIcon(status: string): string {
  switch (status) {
    case "Visit completed":
      return "\u2713";
    case "Upcoming visit":
      return "\u25CB";
    case "Visit in progress":
      return "\u25CF";
    default:
      return "\u00D7";
  }
}

// ---------------------------------------------------------------------------
// Template milestones for the two future pathways
// ---------------------------------------------------------------------------

const STATUS_QUO_MILESTONES: Milestone[] = [
  { label: "Month 1", description: "Symptoms persist" },
  { label: "Month 3", description: "Frustration builds" },
  { label: "Month 6", description: "Quality of life declines" },
  { label: "Month 12", description: "Missed opportunities" },
];

const TREATMENT_MILESTONES: Milestone[] = [
  { label: "Week 2", description: "Adjustment period" },
  { label: "Month 1", description: "Early improvements" },
  { label: "Month 3", description: "Steady progress" },
  { label: "Month 6", description: "New baseline reached" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function RoadmapPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, firstName: true },
  });

  if (!patient) {
    redirect("/portal/intake");
  }

  const data = await getRoadmapData(patient.id);

  const metricLabels: Record<string, string> = {
    pain: "Pain",
    sleep: "Sleep",
    anxiety: "Anxiety",
    mood: "Mood",
    nausea: "Nausea",
    appetite: "Appetite",
    energy: "Energy",
    adherence: "Adherence",
    side_effects: "Side effects",
  };

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Health Roadmap"
        title="Your health trajectory"
        description="A visual map of where you've been, where you are, and where your care plan can take you."
      />

      {/* ================================================================
          PAST — Timeline of encounters
          ================================================================ */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-display text-xl text-text tracking-tight">
            Where you&apos;ve been
          </h2>
          <Badge tone="neutral">Past</Badge>
        </div>

        {data.timeline.length === 0 ? (
          <Card tone="outlined">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-text-muted">
                No visits recorded yet. Your health timeline will grow as you
                engage with your care team.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative pl-6">
            {/* Vertical timeline line */}
            <div
              className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-accent/40 via-border-strong/40 to-transparent"
              aria-hidden="true"
            />

            <div className="space-y-5">
              {data.timeline.map((event) => (
                <div key={event.id} className="relative flex items-start gap-4">
                  {/* Timeline dot */}
                  <span
                    className="absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-accent/30 bg-surface-raised text-[10px] text-accent font-medium shrink-0"
                    aria-hidden="true"
                  >
                    {modalityIcon(event.label)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text">
                      {event.label}
                    </p>
                    <p className="text-xs text-text-subtle">
                      {formatDate(event.date)}
                      {event.detail && (
                        <span className="text-text-muted">
                          {" "}
                          &mdash; {event.detail}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <EditorialRule className="mb-12" />

      {/* ================================================================
          PRESENT — Current status
          ================================================================ */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-display text-xl text-text tracking-tight">
            Where you are now
          </h2>
          <Badge tone="accent">Present</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Active concerns */}
          <Card tone="raised">
            <CardHeader>
              <CardTitle>Active concerns</CardTitle>
              <CardDescription>
                What brought you to care
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.concerns.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.concerns.map((concern) => (
                    <Badge key={concern} tone="warning">
                      {concern}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  No presenting concerns documented yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Latest metrics */}
          <Card tone="raised">
            <CardHeader>
              <CardTitle>Latest metrics</CardTitle>
              <CardDescription>
                Most recent outcome readings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(data.latestMetrics).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.latestMetrics).map(([metric, value]) => (
                    <Badge
                      key={metric}
                      tone={
                        metric === "sleep" || metric === "mood" || metric === "energy"
                          ? value >= 7
                            ? "success"
                            : value >= 4
                              ? "warning"
                              : "danger"
                          : value <= 3
                            ? "success"
                            : value <= 6
                              ? "warning"
                              : "danger"
                      }
                    >
                      {metricLabels[metric] ?? metric}: {value.toFixed(1)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  No outcome data logged yet. Start a check-in to see your
                  current metrics here.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Current regimen */}
          <Card tone="raised" className="md:col-span-2">
            <CardHeader>
              <CardTitle>Current regimen</CardTitle>
              <CardDescription>
                Your active care plan products
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.activeRegimen.length > 0 ? (
                <div className="space-y-3">
                  {data.activeRegimen.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 pl-3 border-l-2 border-accent/20"
                    >
                      <div>
                        <p className="text-sm font-medium text-text">
                          {r.product}
                        </p>
                        <p className="text-xs text-text-muted">
                          {r.instructions}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  No active dosing regimen. Your care team will add products as
                  part of your plan.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <EditorialRule className="mb-12" />

      {/* ================================================================
          FUTURE — Two divergent pathways
          ================================================================ */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-display text-xl text-text tracking-tight">
            Where you could go
          </h2>
          <Badge tone="highlight">Future</Badge>
        </div>

        <p className="text-sm text-text-muted mb-8 max-w-2xl leading-relaxed">
          Two possible paths lie ahead. These are illustrative trajectories
          based on common patient journeys -- not predictions. Your actual
          experience is shaped by many personal factors.
        </p>

        <div className="grid grid-cols-1 gap-6">
          {/* Path A — Status quo (declining) */}
          <Card tone="default" className="overflow-hidden">
            <CardHeader>
              <Eyebrow className="mb-2 text-[color:var(--danger)]">
                Path A
              </Eyebrow>
              <CardTitle>If things stay the same&hellip;</CardTitle>
              <CardDescription>
                Without active care management, symptoms often persist or
                gradually worsen. This path represents the status quo trajectory.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-2 px-2">
                <PathwaySvg
                  direction="down"
                  color="var(--danger)"
                  fillColor="var(--danger)"
                  milestones={STATUS_QUO_MILESTONES}
                />
              </div>
            </CardContent>
          </Card>

          {/* Path B — With treatment (rising) */}
          <Card tone="ambient" className="overflow-hidden">
            <CardHeader>
              <Eyebrow className="mb-2">Path B</Eyebrow>
              <CardTitle>With your care plan&hellip;</CardTitle>
              <CardDescription>
                Consistent engagement with your treatment plan, regular
                check-ins, and open communication with your care team create the
                conditions for meaningful progress.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-2 px-2">
                <PathwaySvg
                  direction="up"
                  color="var(--success)"
                  fillColor="var(--success)"
                  milestones={TREATMENT_MILESTONES}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <EditorialRule className="mb-10" />

      {/* ================================================================
          Goals reminder
          ================================================================ */}
      {data.goals && (
        <Card tone="raised" className="mb-10">
          <CardHeader>
            <CardTitle>Your stated goals</CardTitle>
            <CardDescription>
              A reminder of what you&apos;re working toward
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted leading-relaxed italic">
              &ldquo;{data.goals}&rdquo;
            </p>
          </CardContent>
        </Card>
      )}

      {/* ================================================================
          Disclaimer
          ================================================================ */}
      <p className="text-xs text-text-subtle text-center max-w-lg mx-auto leading-relaxed">
        This roadmap is a conceptual illustration to help you visualize your
        health journey. It does not constitute a medical prediction or guarantee
        of outcomes. Always consult your care team for clinical decisions.
      </p>
    </PageShell>
  );
}
