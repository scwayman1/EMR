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

export const metadata = { title: "Achievements" };

// ---------------------------------------------------------------------------
// Ring config
// ---------------------------------------------------------------------------

interface RingDef {
  key: string;
  label: string;
  color: string;
  trackColor: string;
  description: string;
  comingSoon?: boolean;
}

const RINGS: RingDef[] = [
  {
    key: "move",
    label: "Move",
    color: "var(--highlight)",
    trackColor: "var(--surface-muted)",
    description: "Physical activity logged this week",
  },
  {
    key: "hydrate",
    label: "Hydrate",
    color: "var(--info)",
    trackColor: "var(--surface-muted)",
    description: "Water intake tracking",
    comingSoon: true,
  },
  {
    key: "checkin",
    label: "Check-in",
    color: "var(--accent)",
    trackColor: "var(--surface-muted)",
    description: "Days you logged outcomes this week",
  },
  {
    key: "connect",
    label: "Connect",
    color: "var(--success)",
    trackColor: "var(--surface-muted)",
    description: "Messages sent & assessments completed",
  },
];

// ---------------------------------------------------------------------------
// SVG ring component (server-rendered)
// ---------------------------------------------------------------------------

function ActivityRing({
  percentage,
  color,
  trackColor,
  radius,
  strokeWidth,
}: {
  percentage: number;
  color: string;
  trackColor: string;
  radius: number;
  strokeWidth: number;
}) {
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (clamped / 100) * circumference;
  const size = (radius + strokeWidth) * 2;
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      {/* Background track */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
        opacity={0.6}
      />
      {/* Progress arc */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      {/* Center percentage */}
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={radius * 0.42}
        fontWeight="600"
        fontFamily="var(--font-sans)"
      >
        {clamped}%
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Data fetching helpers
// ---------------------------------------------------------------------------

function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - day;
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

async function getAchievementData(patientId: string) {
  const weekStart = startOfWeek();

  const [
    outcomeLogs,
    energyLogs,
    messageCount,
    assessmentCount,
    allOutcomeLogs,
  ] = await Promise.all([
    // All outcome logs this week (for check-in days)
    prisma.outcomeLog.findMany({
      where: { patientId, loggedAt: { gte: weekStart } },
      select: { loggedAt: true, metric: true },
    }),
    // Energy/activity logs this week (for Move ring)
    prisma.outcomeLog.count({
      where: { patientId, metric: "energy", loggedAt: { gte: weekStart } },
    }),
    // Messages sent this week
    prisma.message.count({
      where: {
        thread: { patientId },
        senderUserId: { not: null },
        createdAt: { gte: weekStart },
      },
    }),
    // Assessments completed this week
    prisma.assessmentResponse.count({
      where: { patientId, submittedAt: { gte: weekStart } },
    }),
    // All outcome logs for streak calculation (last 30 days)
    prisma.outcomeLog.findMany({
      where: {
        patientId,
        loggedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { loggedAt: true },
      orderBy: { loggedAt: "desc" },
    }),
  ]);

  // Move: did they log energy metric? (proxy for physical activity)
  // Goal: at least 3 energy logs per week
  const movePercent = Math.min(100, Math.round((energyLogs / 3) * 100));

  // Check-in: unique days with any outcome log this week (goal: 7)
  const uniqueCheckInDays = new Set(
    outcomeLogs.map((l) => l.loggedAt.toISOString().slice(0, 10)),
  ).size;
  const checkInPercent = Math.min(
    100,
    Math.round((uniqueCheckInDays / 7) * 100),
  );

  // Connect: messages + assessments (goal: 3 combined actions)
  const connectTotal = messageCount + assessmentCount;
  const connectPercent = Math.min(
    100,
    Math.round((connectTotal / 3) * 100),
  );

  // Streak: consecutive days with at least one outcome log
  const uniqueDays = [
    ...new Set(
      allOutcomeLogs.map((l) => l.loggedAt.toISOString().slice(0, 10)),
    ),
  ].sort((a, b) => b.localeCompare(a)); // newest first

  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < uniqueDays.length; i++) {
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);
    if (uniqueDays[i] === expectedStr) {
      streak++;
    } else if (i === 0 && uniqueDays[0] !== today) {
      // Allow starting from yesterday if no log today yet
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (uniqueDays[0] === yesterday.toISOString().slice(0, 10)) {
        streak++;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  // Milestones
  const totalOutcomeLogs = await prisma.outcomeLog.count({
    where: { patientId },
  });
  const totalAssessments = await prisma.assessmentResponse.count({
    where: { patientId },
  });
  const totalMessages = await prisma.message.count({
    where: { thread: { patientId }, senderUserId: { not: null } },
  });

  const milestones: { label: string; achieved: boolean; detail: string }[] = [
    {
      label: "First Check-in",
      achieved: totalOutcomeLogs >= 1,
      detail: "Log your first outcome",
    },
    {
      label: "Week Warrior",
      achieved: uniqueCheckInDays >= 7,
      detail: "Log every day for a week",
    },
    {
      label: "Assessment Pro",
      achieved: totalAssessments >= 3,
      detail: "Complete 3 assessments",
    },
    {
      label: "Communicator",
      achieved: totalMessages >= 5,
      detail: "Send 5 messages to your care team",
    },
    {
      label: "Streak Master",
      achieved: streak >= 7,
      detail: "Maintain a 7-day check-in streak",
    },
    {
      label: "Data Champion",
      achieved: totalOutcomeLogs >= 50,
      detail: "Log 50 outcome entries",
    },
  ];

  return {
    percentages: {
      move: movePercent,
      hydrate: 0, // coming soon
      checkin: checkInPercent,
      connect: connectPercent,
    } as Record<string, number>,
    streak,
    uniqueCheckInDays,
    totalOutcomeLogs,
    totalAssessments,
    totalMessages,
    milestones,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AchievementsPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, firstName: true },
  });

  if (!patient) {
    redirect("/portal/intake");
  }

  const data = await getAchievementData(patient.id);
  const achievedCount = data.milestones.filter((m) => m.achieved).length;

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Achievements"
        title="Your health rings"
        description="Track your weekly engagement like closing rings on your watch. Each ring represents a dimension of your wellness journey."
      />

      {/* ---- Rings grid ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        {RINGS.map((ring) => {
          const pct = ring.comingSoon ? 0 : (data.percentages[ring.key] ?? 0);
          return (
            <Card key={ring.key} tone="raised" className="card-hover">
              <CardContent className="pt-6 pb-6 flex flex-col items-center text-center">
                {ring.comingSoon ? (
                  <div className="relative">
                    <ActivityRing
                      percentage={0}
                      color={ring.color}
                      trackColor={ring.trackColor}
                      radius={52}
                      strokeWidth={10}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: ring.color }}
                      >
                        Soon
                      </span>
                    </div>
                  </div>
                ) : (
                  <ActivityRing
                    percentage={pct}
                    color={ring.color}
                    trackColor={ring.trackColor}
                    radius={52}
                    strokeWidth={10}
                  />
                )}
                <p className="text-sm font-medium text-text mt-3">
                  {ring.label}
                </p>
                <p className="text-[11px] text-text-subtle mt-1 leading-snug">
                  {ring.comingSoon ? "Coming soon" : ring.description}
                </p>
                {ring.comingSoon && (
                  <Badge tone="info" className="mt-2">
                    Coming soon
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <EditorialRule className="mb-10" />

      {/* ---- Streak & weekly summary ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Streak card */}
        <Card tone="ambient">
          <CardHeader>
            <CardTitle>Check-in streak</CardTitle>
            <CardDescription>
              Consecutive days with at least one outcome log
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-5xl font-medium text-text tabular-nums">
                {data.streak}
              </span>
              <span className="text-text-muted text-sm">
                {data.streak === 1 ? "day" : "days"}
              </span>
            </div>
            {data.streak >= 3 && (
              <p className="text-sm text-success mt-3 font-medium">
                {data.streak} day check-in streak! Keep it going!
              </p>
            )}
            {data.streak === 0 && (
              <p className="text-sm text-text-muted mt-3">
                Log an outcome today to start your streak.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Weekly summary card */}
        <Card tone="raised">
          <CardHeader>
            <CardTitle>This week</CardTitle>
            <CardDescription>
              Your engagement summary for the current week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">Days checked in</span>
                <span className="text-sm font-medium text-text tabular-nums">
                  {data.uniqueCheckInDays} / 7
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">Outcomes logged</span>
                <span className="text-sm font-medium text-text tabular-nums">
                  {data.totalOutcomeLogs}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">Assessments done</span>
                <span className="text-sm font-medium text-text tabular-nums">
                  {data.totalAssessments}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">Messages sent</span>
                <span className="text-sm font-medium text-text tabular-nums">
                  {data.totalMessages}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <EditorialRule className="mb-10" />

      {/* ---- Milestones ---- */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl text-text tracking-tight">
            Milestones
          </h2>
          <Badge tone={achievedCount === data.milestones.length ? "success" : "accent"}>
            {achievedCount} / {data.milestones.length} unlocked
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.milestones.map((m) => (
            <div
              key={m.label}
              className={
                "flex items-start gap-4 rounded-xl border p-4 shadow-sm " +
                (m.achieved
                  ? "bg-surface-raised border-border"
                  : "bg-surface-muted/50 border-border/60 opacity-70")
              }
            >
              <span
                className={
                  "flex items-center justify-center h-8 w-8 rounded-full shrink-0 text-sm " +
                  (m.achieved
                    ? "bg-accent text-accent-ink"
                    : "bg-surface-muted text-text-subtle border border-border")
                }
              >
                {m.achieved ? "\u2713" : "\u2022"}
              </span>
              <div>
                <p className="text-sm font-medium text-text">{m.label}</p>
                <p className="text-[12px] text-text-muted mt-0.5">
                  {m.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
