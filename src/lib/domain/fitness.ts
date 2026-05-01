// Fitness module domain — EMR-137
// Personal trainers, care-team-aligned workout plans, and exercise tracking.

export type WorkoutLevel = "beginner" | "intermediate" | "advanced";
export type WorkoutFocus =
  | "mobility"
  | "strength"
  | "cardio"
  | "balance"
  | "recovery";

export interface Workout {
  id: string;
  title: string;
  focus: WorkoutFocus;
  level: WorkoutLevel;
  durationMin: number;
  emoji: string;
  description: string;
  steps: string[];
  cannabisFriendly: boolean;
}

export const WORKOUT_LIBRARY: Workout[] = [
  {
    id: "morning-mobility",
    title: "10-minute morning mobility",
    focus: "mobility",
    level: "beginner",
    durationMin: 10,
    emoji: "\u{1F9D8}",
    description:
      "Loosen up neck, shoulders, hips, and ankles before your day starts.",
    steps: [
      "Cat-cow on hands and knees — 60 seconds",
      "World's greatest stretch — 5 each side",
      "Ankle circles — 10 each direction",
      "Standing forward fold with knee bend — 60 seconds",
      "Wall slides — 10 reps",
    ],
    cannabisFriendly: true,
  },
  {
    id: "low-impact-cardio",
    title: "20-minute walking interval",
    focus: "cardio",
    level: "beginner",
    durationMin: 20,
    emoji: "\u{1F6B6}",
    description:
      "Joint-friendly cardio that improves sleep quality the same night.",
    steps: [
      "5-minute easy walk warmup",
      "1-minute brisk walk × 6 rounds (with 1 minute easy between)",
      "5-minute cool down",
      "Hydrate before and after",
    ],
    cannabisFriendly: false,
  },
  {
    id: "post-dose-flow",
    title: "Post-dose mindful flow",
    focus: "recovery",
    level: "beginner",
    durationMin: 15,
    emoji: "\u{1F33F}",
    description:
      "Gentle movement timed 30–60 minutes after a tincture or edible to deepen body awareness.",
    steps: [
      "Box breathing — 4 rounds",
      "Sun salutation A — 3 cycles",
      "Reclined twist — 90 seconds each side",
      "Legs-up-the-wall — 5 minutes",
      "Body scan — 2 minutes",
    ],
    cannabisFriendly: true,
  },
  {
    id: "bodyweight-strength",
    title: "Foundational bodyweight strength",
    focus: "strength",
    level: "intermediate",
    durationMin: 25,
    emoji: "\u{1F4AA}",
    description: "Three rounds of pushes, pulls, squats, and a core finisher.",
    steps: [
      "10 bodyweight squats",
      "8 elevated push-ups",
      "10 reverse lunges (per leg)",
      "8 inverted rows (under sturdy table) or band pulls",
      "30-second plank — repeat 3 rounds",
    ],
    cannabisFriendly: false,
  },
  {
    id: "balance-fall-prevention",
    title: "Balance & fall prevention",
    focus: "balance",
    level: "beginner",
    durationMin: 12,
    emoji: "\u{1F9CD}",
    description:
      "Useful for older patients and anyone reintroducing movement after injury.",
    steps: [
      "Single-leg stand — 30 seconds each side",
      "Heel-to-toe walk — 20 steps",
      "Chair sit-to-stand — 10 reps",
      "Side leg raises — 10 each leg",
      "Wall-supported squats — 10 reps",
    ],
    cannabisFriendly: true,
  },
];

export interface CareTeamTrainer {
  id: string;
  name: string;
  credentials: string;
  specialties: string[];
  bio: string;
  avatarEmoji: string;
  acceptingNew: boolean;
  modality: ("video" | "in-person" | "async")[];
}

export const CARE_TEAM_TRAINERS: CareTeamTrainer[] = [
  {
    id: "alex-rivera",
    name: "Alex Rivera",
    credentials: "NSCA-CPT, MS Exercise Science",
    specialties: ["Chronic pain", "Cannabis-assisted recovery", "Strength foundations"],
    bio:
      "Alex specializes in restoring movement for patients managing chronic pain. Works closely with the cannabis care team to time sessions around dosing.",
    avatarEmoji: "\u{1F468}‍\u{1F33E}",
    acceptingNew: true,
    modality: ["video", "in-person"],
  },
  {
    id: "priya-shah",
    name: "Priya Shah, DPT",
    credentials: "Doctor of Physical Therapy",
    specialties: ["Post-surgical recovery", "Spine health", "Balance"],
    bio:
      "Priya bridges PT and personal training. Designs progressive plans that earn back range of motion before adding load.",
    avatarEmoji: "\u{1F469}‍\u{2695}\u{FE0F}",
    acceptingNew: true,
    modality: ["video", "in-person", "async"],
  },
  {
    id: "marcus-okafor",
    name: "Marcus Okafor",
    credentials: "ACE-CPT, Yoga RYT-200",
    specialties: ["Mindful movement", "Cannabis-friendly yoga", "Breathwork"],
    bio:
      "Marcus blends yoga, breath, and gentle resistance work. Best for patients adding movement back gradually after pain flares.",
    avatarEmoji: "\u{1F9D8}",
    acceptingNew: false,
    modality: ["video", "async"],
  },
];

// Suggest workouts that fit the patient's recent outcome data and any
// trainer notes. Pure function — no DB calls. Caller fetches metrics.
export function suggestWorkouts(input: {
  latestPain?: number;
  latestEnergy?: number;
  hasRegimen: boolean;
  level?: WorkoutLevel;
}): Workout[] {
  const out: Workout[] = [];
  const level = input.level ?? "beginner";

  if ((input.latestPain ?? 0) >= 6) {
    out.push(...WORKOUT_LIBRARY.filter((w) => w.focus === "mobility" || w.focus === "recovery"));
  } else if ((input.latestEnergy ?? 0) >= 6) {
    out.push(...WORKOUT_LIBRARY.filter((w) => w.focus === "cardio" || w.focus === "strength"));
  } else {
    out.push(...WORKOUT_LIBRARY.filter((w) => w.focus === "mobility" || w.focus === "balance"));
  }

  if (input.hasRegimen) {
    const post = WORKOUT_LIBRARY.find((w) => w.id === "post-dose-flow");
    if (post && !out.includes(post)) out.unshift(post);
  }

  return out
    .filter((w) => w.level === level || w.level === "beginner")
    .slice(0, 4);
}
