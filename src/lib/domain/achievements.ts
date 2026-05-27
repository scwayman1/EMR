// Lifestyle achievements + streaks — EMR-161
// Pure functions that turn outcome / dose log timestamps into badges.
// No persistence yet — these compute on demand so we can render a consistent
// gamification surface across home, lifestyle, and storybook pages.

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
  progressLabel?: string;
}

interface AchievementInputs {
  outcomeLogCount: number;
  consecutiveDays: number;
  uniqueMetricsLogged: number;
  daysSinceLastVisit: number | null;
  hasMessagedTeam: boolean;
  intakeComplete: number; // 0-100
}

export function buildAchievements(input: AchievementInputs): Achievement[] {
  return [
    {
      id: "first-checkin",
      emoji: "\u{1F331}",
      title: "Planted the seed",
      description: "Logged your very first check-in.",
      unlocked: input.outcomeLogCount >= 1,
      progressLabel: input.outcomeLogCount >= 1 ? undefined : "1 check-in to unlock",
    },
    {
      id: "ten-checkins",
      emoji: "\u{1F33F}",
      title: "Sprouting",
      description: "Logged 10 check-ins.",
      unlocked: input.outcomeLogCount >= 10,
      progressLabel: `${Math.min(10, input.outcomeLogCount)}/10 check-ins`,
    },
    {
      id: "week-streak",
      emoji: "\u{1F525}",
      title: "Seven-day streak",
      description: "Logged a check-in seven days in a row.",
      unlocked: input.consecutiveDays >= 7,
      progressLabel: `${Math.min(7, input.consecutiveDays)}/7 days`,
    },
    {
      id: "balanced-tracker",
      emoji: "\u{1F308}",
      title: "Balanced tracker",
      description: "Logged at least four different metrics.",
      unlocked: input.uniqueMetricsLogged >= 4,
      progressLabel: `${input.uniqueMetricsLogged}/4 metrics`,
    },
    {
      id: "stayed-in-touch",
      emoji: "\u{1F4AC}",
      title: "Stayed in touch",
      description: "Sent a message to your care team.",
      unlocked: input.hasMessagedTeam,
    },
    {
      id: "chart-complete",
      emoji: "\u{1F4D6}",
      title: "Story written",
      description: "Filled out 100% of your intake.",
      unlocked: input.intakeComplete >= 100,
      progressLabel: `${input.intakeComplete}% complete`,
    },
  ];
}

// Compute consecutive-day streak from log timestamps. We treat a streak as
// any run of calendar days (in the local timezone) where at least one log
// exists. A gap of one full day breaks the streak.
export function consecutiveDayStreak(timestamps: Date[]): number {
  if (timestamps.length === 0) return 0;

  const days = new Set<string>();
  for (const t of timestamps) {
    days.add(t.toISOString().slice(0, 10));
  }

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i += 1) {
    const probe = new Date(today);
    probe.setDate(today.getDate() - i);
    const key = probe.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
    } else {
      // Allow today to be missing — many patients log later in the day
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}

export interface WearableSummary {
  source: string;
  emoji: string;
  steps: number;
  sleepHours: number;
  restingHeartRate: number;
  mindfulMinutes: number;
}

// Derived from the integrations view's mock state. In production this would
// come from a real Apple Health / Fitbit sync table.
export const DEMO_WEARABLE_SUMMARY: WearableSummary = {
  source: "Apple Health",
  emoji: "\u{1F34E}",
  steps: 7842,
  sleepHours: 7.1,
  restingHeartRate: 64,
  mindfulMinutes: 12,
};
