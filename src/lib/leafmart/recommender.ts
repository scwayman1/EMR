import type { LeafmartProduct } from "@/components/leafmart/LeafmartProductCard";

export type GoalAnswer =
  | "Calmer in the evening"
  | "Less pain after a long day"
  | "Better sleep"
  | "Clearer skin"
  | "More focused";

export type ExperienceAnswer =
  | "Yes, regularly"
  | "Curious, not regular"
  | "First time exploring"
  | "I used to, took a break";

export type RestrictionAnswer =
  | "I prefer non-intoxicating"
  | "Open to THC (where legal)"
  | "Topical only"
  | "No preference";

export interface QuizAnswers {
  goal: GoalAnswer | string;
  experience: ExperienceAnswer | string;
  restriction: RestrictionAnswer | string;
}

export interface ScoredProduct {
  product: LeafmartProduct;
  score: number;
  reasons: string[];
}

/* ── Goal → category keyword map ────────────────────────────── */

interface GoalProfile {
  primary: string[];   // category keywords for primary match (3 pts)
  secondary: string[]; // secondary match (1.5 pts)
  label: string;       // human label for "matched for"
}

const GOAL_PROFILES: Record<string, GoalProfile> = {
  "Calmer in the evening": {
    primary: ["calm", "anxiety", "edge", "quiet", "wind-down", "wind down", "evening"],
    secondary: ["sleep", "night", "relax"],
    label: "Calm",
  },
  "Less pain after a long day": {
    primary: ["recovery", "relief", "tension", "balm", "topical", "soreness", "long day", "pain"],
    secondary: ["calm", "wind-down"],
    label: "Relief",
  },
  "Better sleep": {
    primary: ["sleep", "evening", "wind-down", "wind down", "night", "cbn"],
    secondary: ["calm", "quiet"],
    label: "Sleep",
  },
  "Clearer skin": {
    primary: ["skin", "serum", "barrier", "topical"],
    secondary: ["recovery"],
    label: "Skin",
  },
  "More focused": {
    primary: ["focus", "clarity", "alert", "daytime", "morning"],
    secondary: ["calm"],
    label: "Focus",
  },
};

/* ── Experience adjustments ─────────────────────────────────── */

const BEGINNER_EXPERIENCES = new Set([
  "Curious, not regular",
  "First time exploring",
  "I used to, took a break",
]);

function isBeginnerFriendly(p: LeafmartProduct) {
  const hay = `${p.name} ${p.support} ${p.formatLabel}`.toLowerCase();
  // Soft signals — non-intoxicating cues, gentle language
  if (/\bcbd\b|\bcbn\b|\bcbg\b/.test(hay)) return true;
  if (/non-?intoxicating|plant-?powered|gentle|soft|quiet/.test(hay)) return true;
  if (p.format === "topical" || p.format === "serum") return true;
  return false;
}

/* ── Restriction filters ────────────────────────────────────── */

const TOPICAL_FORMATS = new Set(["topical", "balm", "serum"]);

function passesRestriction(p: LeafmartProduct, restriction: string): { pass: boolean; reason?: string } {
  if (restriction === "Topical only") {
    if (!TOPICAL_FORMATS.has(p.format)) return { pass: false };
    return { pass: true, reason: "Topical only" };
  }
  if (restriction === "I prefer non-intoxicating") {
    const hay = `${p.name} ${p.support} ${p.formatLabel}`.toLowerCase();
    // Exclude any product whose copy implies psychoactive THC content
    if (/\bthc\b/.test(hay) && !/non-?intoxicating/.test(hay)) {
      return { pass: false };
    }
    return { pass: true, reason: "Non-intoxicating" };
  }
  // "Open to THC" and "No preference" — no filter
  return { pass: true };
}

/* ── Scoring ────────────────────────────────────────────────── */

const GOAL_WEIGHT = 3;
const EXPERIENCE_WEIGHT = 2;
const RESTRICTION_WEIGHT = 2;
const OUTCOME_WEIGHT = 1;

export function scoreProducts(answers: QuizAnswers, products: LeafmartProduct[]): ScoredProduct[] {
  const profile = GOAL_PROFILES[answers.goal];
  const isBeginner = BEGINNER_EXPERIENCES.has(answers.experience);

  const scored: ScoredProduct[] = [];

  for (const p of products) {
    const restrictionResult = passesRestriction(p, answers.restriction);
    if (!restrictionResult.pass) continue;

    const reasons: string[] = [];
    let score = 0;

    // Goal match
    if (profile) {
      const hay = `${p.name} ${p.support} ${p.formatLabel}`.toLowerCase();
      const primaryHit = profile.primary.some((k) => hay.includes(k));
      const secondaryHit = profile.secondary.some((k) => hay.includes(k));
      if (primaryHit) {
        score += GOAL_WEIGHT;
        reasons.push(profile.label);
      } else if (secondaryHit) {
        score += GOAL_WEIGHT * 0.5;
        reasons.push(`${profile.label} (related)`);
      }
    }

    // Experience match
    if (isBeginner && isBeginnerFriendly(p)) {
      score += EXPERIENCE_WEIGHT;
      reasons.push("Beginner-friendly");
    } else if (!isBeginner) {
      // Experienced users — slight boost for full-spectrum / higher dose products
      const hay = `${p.support} ${p.formatLabel}`.toLowerCase();
      if (/full-?spectrum|1500mg|cbn/.test(hay)) {
        score += EXPERIENCE_WEIGHT * 0.6;
      }
    }

    // Restriction match
    if (restrictionResult.reason) {
      score += RESTRICTION_WEIGHT;
      reasons.push(restrictionResult.reason);
    }

    // Outcome tiebreaker — pct/100 contributes up to OUTCOME_WEIGHT
    score += (p.pct / 100) * OUTCOME_WEIGHT;

    scored.push({ product: p, score, reasons });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export function topMatches(answers: QuizAnswers, products: LeafmartProduct[], n = 3): ScoredProduct[] {
  return scoreProducts(answers, products).slice(0, n);
}
