// EMR-176 — Make EMR Fun and Engaging
// XP, level badges, achievements, daily login streaks, and celebration cues
// for the patient and clinician surfaces. Pure functions — UI surfaces call
// `applyEvent` and render whatever shows up in the result.

export type EngagementEventKind =
  | "outcome-log"
  | "complete-assessment"
  | "complete-intake"
  | "message-care-team"
  | "schedule-visit"
  | "complete-visit"
  | "log-dose"
  | "mindfulness-checkin"
  | "fitness-session"
  | "food-log"
  | "garden-photo"
  | "harvest-logged"
  | "breathing-break"
  | "daily-login";

export interface EngagementEvent {
  kind: EngagementEventKind;
  occurredAt: string;
  patientId?: string;
}

export interface EngagementState {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  streakDays: number;
  lastLoginDate: string | null;
  unlockedAchievements: string[];
  recentCelebration: Celebration | null;
}

export interface Celebration {
  id: string;
  emoji: string;
  title: string;
  body: string;
  level?: number;
}

export const XP_VALUES: Record<EngagementEventKind, number> = {
  "outcome-log": 8,
  "complete-assessment": 30,
  "complete-intake": 60,
  "message-care-team": 12,
  "schedule-visit": 20,
  "complete-visit": 50,
  "log-dose": 6,
  "mindfulness-checkin": 10,
  "fitness-session": 15,
  "food-log": 6,
  "garden-photo": 10,
  "harvest-logged": 60,
  "breathing-break": 5,
  "daily-login": 4,
};

export interface LevelBadge {
  level: number;
  title: string;
  emoji: string;
  description: string;
  /** Cumulative XP needed to reach this level. */
  threshold: number;
}

export const LEVEL_BADGES: LevelBadge[] = [
  {
    level: 1,
    title: "Sprout",
    emoji: "\u{1F331}",
    description: "Welcome to your care plan.",
    threshold: 0,
  },
  {
    level: 2,
    title: "Sapling",
    emoji: "\u{1F33F}",
    description: "Habits are starting to take root.",
    threshold: 100,
  },
  {
    level: 3,
    title: "Bloom",
    emoji: "\u{1F338}",
    description: "Logging, mindfulness, movement — all online.",
    threshold: 250,
  },
  {
    level: 4,
    title: "Grove",
    emoji: "\u{1F333}",
    description: "Care team, garden, and lifestyle in sync.",
    threshold: 500,
  },
  {
    level: 5,
    title: "Canopy",
    emoji: "\u{1F343}",
    description: "Mentor-tier — model patient.",
    threshold: 900,
  },
  {
    level: 6,
    title: "Harvest",
    emoji: "\u{1F33E}",
    description: "Long-term steward of your own care.",
    threshold: 1500,
  },
];

export interface AchievementDefinition {
  id: string;
  emoji: string;
  title: string;
  description: string;
  trigger: (input: AchievementContext) => boolean;
}

export interface AchievementContext {
  totalEvents: Record<EngagementEventKind, number>;
  streakDays: number;
  totalXp: number;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first-day",
    emoji: "\u{1F389}",
    title: "First day",
    description: "Logged in for the first time.",
    trigger: (c) => c.totalEvents["daily-login"] >= 1,
  },
  {
    id: "seven-day-streak",
    emoji: "\u{1F525}",
    title: "Seven-day streak",
    description: "Logged in seven days in a row.",
    trigger: (c) => c.streakDays >= 7,
  },
  {
    id: "twenty-eight-day-streak",
    emoji: "\u{1F31F}",
    title: "Four-week habit",
    description: "Logged in twenty-eight days in a row.",
    trigger: (c) => c.streakDays >= 28,
  },
  {
    id: "ten-outcome-logs",
    emoji: "\u{1F4DD}",
    title: "Ten check-ins",
    description: "Captured ten outcome check-ins.",
    trigger: (c) => c.totalEvents["outcome-log"] >= 10,
  },
  {
    id: "first-assessment",
    emoji: "\u{1F4CB}",
    title: "First assessment",
    description: "Completed your first questionnaire.",
    trigger: (c) => c.totalEvents["complete-assessment"] >= 1,
  },
  {
    id: "five-mindfulness",
    emoji: "\u{1F9D8}",
    title: "Mindful five",
    description: "Five mindfulness check-ins.",
    trigger: (c) => c.totalEvents["mindfulness-checkin"] >= 5,
  },
  {
    id: "five-fitness",
    emoji: "\u{1F4AA}",
    title: "Five workouts",
    description: "Five logged exercise sessions.",
    trigger: (c) => c.totalEvents["fitness-session"] >= 5,
  },
  {
    id: "first-harvest",
    emoji: "\u{1FAB4}",
    title: "First harvest",
    description: "Logged a successful home harvest.",
    trigger: (c) => c.totalEvents["harvest-logged"] >= 1,
  },
  {
    id: "level-three",
    emoji: "\u{1F338}",
    title: "Reached Bloom",
    description: "Hit level 3 — habit-stage patient.",
    trigger: (c) => c.totalXp >= 250,
  },
];

export function emptyState(): EngagementState {
  return {
    totalXp: 0,
    level: 1,
    xpIntoLevel: 0,
    xpForNextLevel: LEVEL_BADGES[1]?.threshold ?? 100,
    streakDays: 0,
    lastLoginDate: null,
    unlockedAchievements: [],
    recentCelebration: null,
  };
}

export function levelForXp(totalXp: number): {
  badge: LevelBadge;
  xpIntoLevel: number;
  xpForNextLevel: number;
} {
  let badge = LEVEL_BADGES[0];
  for (const b of LEVEL_BADGES) {
    if (totalXp >= b.threshold) badge = b;
  }
  const next = LEVEL_BADGES.find((b) => b.level === badge.level + 1);
  const xpIntoLevel = totalXp - badge.threshold;
  const span = next ? next.threshold - badge.threshold : 0;
  return {
    badge,
    xpIntoLevel,
    xpForNextLevel: next ? span : 0,
  };
}

export function badgeForLevel(level: number): LevelBadge | undefined {
  return LEVEL_BADGES.find((b) => b.level === level);
}

interface ApplyContext {
  state: EngagementState;
  totalEvents: Record<EngagementEventKind, number>;
}

const ZERO_EVENTS: Record<EngagementEventKind, number> = {
  "outcome-log": 0,
  "complete-assessment": 0,
  "complete-intake": 0,
  "message-care-team": 0,
  "schedule-visit": 0,
  "complete-visit": 0,
  "log-dose": 0,
  "mindfulness-checkin": 0,
  "fitness-session": 0,
  "food-log": 0,
  "garden-photo": 0,
  "harvest-logged": 0,
  "breathing-break": 0,
  "daily-login": 0,
};

export function buildEventCounts(
  events: EngagementEvent[],
): Record<EngagementEventKind, number> {
  const counts = { ...ZERO_EVENTS };
  for (const e of events) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
  return counts;
}

export function applyEvent(
  ctx: ApplyContext,
  event: EngagementEvent,
): { state: EngagementState; counts: Record<EngagementEventKind, number> } {
  const xp = XP_VALUES[event.kind] ?? 0;
  const counts = { ...ctx.totalEvents };
  counts[event.kind] = (counts[event.kind] ?? 0) + 1;

  const totalXp = ctx.state.totalXp + xp;
  const { badge, xpIntoLevel, xpForNextLevel } = levelForXp(totalXp);

  const today = event.occurredAt.slice(0, 10);
  const streakDays = updateStreak(
    ctx.state.lastLoginDate,
    ctx.state.streakDays,
    today,
    event.kind === "daily-login",
  );

  const achievementCtx: AchievementContext = {
    totalEvents: counts,
    streakDays,
    totalXp,
  };
  const newlyUnlocked = ACHIEVEMENTS.filter(
    (a) =>
      !ctx.state.unlockedAchievements.includes(a.id) && a.trigger(achievementCtx),
  );

  let celebration: Celebration | null = null;
  if (badge.level > ctx.state.level) {
    celebration = {
      id: `level-${badge.level}`,
      emoji: badge.emoji,
      title: `Level ${badge.level} — ${badge.title}`,
      body: badge.description,
      level: badge.level,
    };
  } else if (newlyUnlocked.length > 0) {
    const first = newlyUnlocked[0];
    celebration = {
      id: first.id,
      emoji: first.emoji,
      title: first.title,
      body: first.description,
    };
  } else if (streakDays > ctx.state.streakDays && streakDays % 7 === 0) {
    celebration = {
      id: `streak-${streakDays}`,
      emoji: "\u{1F525}",
      title: `${streakDays}-day streak`,
      body: "Showing up is the whole game.",
    };
  }

  return {
    counts,
    state: {
      totalXp,
      level: badge.level,
      xpIntoLevel,
      xpForNextLevel,
      streakDays,
      lastLoginDate: event.kind === "daily-login" ? today : ctx.state.lastLoginDate,
      unlockedAchievements: [
        ...ctx.state.unlockedAchievements,
        ...newlyUnlocked.map((a) => a.id),
      ],
      recentCelebration: celebration,
    },
  };
}

function updateStreak(
  lastLogin: string | null,
  prevStreak: number,
  today: string,
  isLoginEvent: boolean,
): number {
  if (!isLoginEvent) return prevStreak;
  if (!lastLogin) return 1;
  if (lastLogin === today) return prevStreak;
  const last = new Date(lastLogin);
  const now = new Date(today);
  const diffDays = Math.round(
    (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 1) return prevStreak + 1;
  return 1;
}

export function buildEngagementSnapshot(
  events: EngagementEvent[],
): EngagementState & { counts: Record<EngagementEventKind, number> } {
  let state = emptyState();
  let counts = { ...ZERO_EVENTS };
  for (const event of events) {
    const next = applyEvent({ state, totalEvents: counts }, event);
    state = next.state;
    counts = next.counts;
  }
  return { ...state, counts };
}

export function formatXpProgressLabel(state: EngagementState): string {
  if (state.xpForNextLevel === 0) {
    return `Max level — ${state.totalXp} XP`;
  }
  return `${state.xpIntoLevel}/${state.xpForNextLevel} XP to next level`;
}

export function celebrationFromLevelUp(level: number): Celebration | null {
  const badge = badgeForLevel(level);
  if (!badge) return null;
  return {
    id: `level-${badge.level}`,
    emoji: badge.emoji,
    title: `Level ${badge.level} — ${badge.title}`,
    body: badge.description,
    level: badge.level,
  };
}
