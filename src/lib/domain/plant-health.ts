import { prisma } from "@/lib/db/prisma";

// ---------------------------------------------------------------------------
// Plant Health Scoring — EMR-022
//
// Computes a virtual cannabis plant's health from a patient's recent
// behavioral and clinical data. The plant grows when the patient engages
// with their care; it wilts when they go silent.
// ---------------------------------------------------------------------------

export interface PlantHealthFactor {
  label: string;
  status: "positive" | "neutral" | "negative";
  detail: string;
}

export interface PlantHealth {
  score: number; // 0-100
  stage: "seed" | "sprout" | "growing" | "healthy" | "flowering" | "thriving";
  leafColor: "brown" | "yellow" | "light-green" | "green" | "deep-green";
  hasFlowers: boolean;
  stemCount: number; // 1-5
  leafCount: number; // 0-12
  healthFactors: PlantHealthFactor[];
}

// ---- helpers ---------------------------------------------------------------

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function trend(values: number[]): "up" | "down" | "flat" {
  if (values.length < 2) return "flat";
  // Compare the average of the first half to the second half.
  const mid = Math.floor(values.length / 2);
  const first = values.slice(0, mid);
  const second = values.slice(mid);
  const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
  const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;
  const diff = avgSecond - avgFirst;
  if (Math.abs(diff) < 0.4) return "flat";
  return diff > 0 ? "up" : "down";
}

function scoreToStage(
  score: number,
): "seed" | "sprout" | "growing" | "healthy" | "flowering" | "thriving" {
  if (score <= 15) return "seed";
  if (score <= 30) return "sprout";
  if (score <= 50) return "growing";
  if (score <= 70) return "healthy";
  if (score <= 85) return "flowering";
  return "thriving";
}

function scoreToLeafColor(
  score: number,
): "brown" | "yellow" | "light-green" | "green" | "deep-green" {
  if (score <= 15) return "brown";
  if (score <= 30) return "yellow";
  if (score <= 50) return "light-green";
  if (score <= 75) return "green";
  return "deep-green";
}

// ---- main computation ------------------------------------------------------

export async function computePlantHealth(
  patientId: string,
): Promise<PlantHealth> {
  const sevenDaysAgo = daysAgo(7);
  const fourteenDaysAgo = daysAgo(14);
  const thirtyDaysAgo = daysAgo(30);

  // Fire all queries concurrently.
  const [
    recentOutcomeLogs,
    outcomeLogs30d,
    assessmentResponses,
    recentEncounters,
    completedTasks,
    recentMessages,
    chartSummary,
    activeRegimens,
    recentDoseLogs,
  ] = await Promise.all([
    // Outcome logs in last 7 days
    prisma.outcomeLog.findMany({
      where: { patientId, loggedAt: { gte: sevenDaysAgo } },
    }),
    // Outcome logs in last 30 days (for trends)
    prisma.outcomeLog.findMany({
      where: { patientId, loggedAt: { gte: thirtyDaysAgo } },
      orderBy: { loggedAt: "asc" },
    }),
    // Assessments in last 30 days
    prisma.assessmentResponse.findMany({
      where: { patientId, submittedAt: { gte: thirtyDaysAgo } },
    }),
    // Encounters in last 30 days (completed or scheduled)
    prisma.encounter.findMany({
      where: {
        patientId,
        OR: [
          { completedAt: { gte: thirtyDaysAgo } },
          { scheduledFor: { gte: thirtyDaysAgo } },
        ],
        status: { in: ["complete", "in_progress"] },
      },
    }),
    // Completed tasks
    prisma.task.findMany({
      where: { patientId, status: "done" },
      orderBy: { completedAt: "desc" },
      take: 10,
    }),
    // Messages sent by patient in last 14 days
    prisma.messageThread.findMany({
      where: {
        patientId,
        lastMessageAt: { gte: fourteenDaysAgo },
      },
      include: {
        messages: {
          where: { createdAt: { gte: fourteenDaysAgo } },
          take: 1,
        },
      },
    }),
    // Chart summary for completeness
    prisma.chartSummary.findUnique({ where: { patientId } }),
    // Active dosing regimens
    prisma.dosingRegimen.findMany({
      where: { patientId, active: true },
    }),
    // Recent dose logs
    prisma.doseLog.findMany({
      where: { patientId, loggedAt: { gte: sevenDaysAgo } },
    }),
  ]);

  let score = 0;
  const factors: PlantHealthFactor[] = [];

  // 1. Outcome logging frequency (logged in last 7 days? +15)
  if (recentOutcomeLogs.length > 0) {
    score += 15;
    factors.push({
      label: "Check-ins",
      status: "positive",
      detail: `You logged ${recentOutcomeLogs.length} check-in${recentOutcomeLogs.length === 1 ? "" : "s"} this week.`,
    });
  } else {
    factors.push({
      label: "Check-ins",
      status: "negative",
      detail:
        "No check-ins this week. Logging how you feel helps your plant grow.",
    });
  }

  // 2. Pain trend (trending down? +10, trending up? -10)
  const painValues = outcomeLogs30d
    .filter((l) => l.metric === "pain")
    .map((l) => l.value);
  const painDirection = trend(painValues);
  if (painDirection === "down") {
    score += 10;
    factors.push({
      label: "Pain trend",
      status: "positive",
      detail: "Your pain levels are trending down. Great progress.",
    });
  } else if (painDirection === "up") {
    score -= 10;
    factors.push({
      label: "Pain trend",
      status: "negative",
      detail:
        "Pain has been trending up. Your care team can help adjust your plan.",
    });
  } else if (painValues.length > 0) {
    factors.push({
      label: "Pain trend",
      status: "neutral",
      detail: "Pain levels are holding steady.",
    });
  }

  // 3. Sleep trend (improving? +10)
  const sleepValues = outcomeLogs30d
    .filter((l) => l.metric === "sleep")
    .map((l) => l.value);
  const sleepDirection = trend(sleepValues);
  if (sleepDirection === "up") {
    // Higher sleep score = better sleep
    score += 10;
    factors.push({
      label: "Sleep quality",
      status: "positive",
      detail: "Your sleep is improving. Rest fuels growth.",
    });
  } else if (sleepDirection === "down") {
    score -= 5;
    factors.push({
      label: "Sleep quality",
      status: "negative",
      detail:
        "Sleep quality has dipped. Consider logging what helps you rest.",
    });
  } else if (sleepValues.length > 0) {
    factors.push({
      label: "Sleep quality",
      status: "neutral",
      detail: "Sleep quality is steady.",
    });
  }

  // 4. Assessment completion (any in last 30 days? +10)
  if (assessmentResponses.length > 0) {
    score += 10;
    factors.push({
      label: "Assessments",
      status: "positive",
      detail: `You completed ${assessmentResponses.length} assessment${assessmentResponses.length === 1 ? "" : "s"} recently.`,
    });
  } else {
    factors.push({
      label: "Assessments",
      status: "neutral",
      detail:
        "No assessments completed recently. They help your team understand your progress.",
    });
  }

  // 5. Recent encounter (visit in last 30 days? +10)
  if (recentEncounters.length > 0) {
    score += 10;
    factors.push({
      label: "Recent visit",
      status: "positive",
      detail: "You had a visit with your care team this month.",
    });
  } else {
    factors.push({
      label: "Recent visit",
      status: "neutral",
      detail: "No recent visits. Seeing your team regularly helps your plant bloom.",
    });
  }

  // 6. Active tasks completed (+10 per task, up to 20)
  const taskPoints = Math.min(completedTasks.length * 10, 20);
  score += taskPoints;
  if (completedTasks.length > 0) {
    factors.push({
      label: "Tasks completed",
      status: "positive",
      detail: `You've completed ${completedTasks.length} task${completedTasks.length === 1 ? "" : "s"}. Every action counts.`,
    });
  } else {
    factors.push({
      label: "Tasks",
      status: "neutral",
      detail: "Complete care plan tasks to help your plant grow stronger.",
    });
  }

  // 7. Message engagement (sent a message in last 14 days? +5)
  const hasRecentMessages = recentMessages.some((t) => t.messages.length > 0);
  if (hasRecentMessages) {
    score += 5;
    factors.push({
      label: "Engagement",
      status: "positive",
      detail: "You've been in touch with your care team. Communication nourishes growth.",
    });
  }

  // 8. Intake completeness (chart readiness > 80%? +10)
  const completeness = chartSummary?.completenessScore ?? 0;
  if (completeness >= 80) {
    score += 10;
    factors.push({
      label: "Chart completeness",
      status: "positive",
      detail: `Your intake is ${completeness}% complete. Strong roots.`,
    });
  } else if (completeness > 0) {
    factors.push({
      label: "Chart completeness",
      status: "neutral",
      detail: `Intake is ${completeness}% complete. Finishing it gives your plant deeper roots.`,
    });
  }

  // 9. Cannabis regimen adherence (active regimen + recent dose logs? +10)
  if (activeRegimens.length > 0 && recentDoseLogs.length > 0) {
    score += 10;
    factors.push({
      label: "Regimen adherence",
      status: "positive",
      detail: "You're staying consistent with your cannabis regimen.",
    });
  } else if (activeRegimens.length > 0) {
    factors.push({
      label: "Regimen adherence",
      status: "negative",
      detail: "You have an active regimen but no recent dose logs. Your plant is thirsty.",
    });
  }

  // Clamp score to 0-100.
  score = Math.max(0, Math.min(100, score));

  const stage = scoreToStage(score);
  const leafColor = scoreToLeafColor(score);

  return {
    score,
    stage,
    leafColor,
    hasFlowers: score >= 71,
    stemCount: Math.max(1, Math.min(5, Math.ceil(score / 20))),
    leafCount: Math.max(0, Math.min(12, Math.round((score / 100) * 12))),
    healthFactors: factors,
  };
}

// ---- stage display helpers -------------------------------------------------

export const STAGE_LABELS: Record<PlantHealth["stage"], string> = {
  seed: "A tiny seed",
  sprout: "Just sprouted",
  growing: "Growing strong",
  healthy: "Healthy & green",
  flowering: "Flowering beautifully",
  thriving: "Thriving",
};

export const STAGE_DESCRIPTIONS: Record<PlantHealth["stage"], string> = {
  seed: "Your plant is just getting started. Every check-in and visit helps it sprout.",
  sprout:
    "The first shoots are pushing through. Keep logging your outcomes to help it grow.",
  growing:
    "Your plant is putting out new leaves. Consistency is its favorite fertilizer.",
  healthy:
    "Looking green and vibrant. Your care team can see the difference you're making.",
  flowering:
    "Beautiful blooms are appearing. Your dedication to your health is paying off.",
  thriving:
    "Your plant is absolutely thriving. You're doing an incredible job taking care of yourself.",
};

export const STAGE_ENCOURAGEMENT: Record<PlantHealth["stage"], string> = {
  seed: "Log how you're feeling today to plant the first seed of growth.",
  sprout: "A few more check-ins this week and you'll see real progress.",
  growing: "You're building momentum. Try completing a task from your care plan.",
  healthy: "Keep it up! An assessment or visit would bring out new leaves.",
  flowering:
    "You're so close to a fully thriving plant. Stay the course.",
  thriving:
    "You've reached peak growth. Keep tending to your health to stay here.",
};
