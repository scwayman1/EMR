// EMR-126 — Provider CME Credits via Research.
//
// This module sits beside `domain/provider-cme.ts`: that file owns the
// session→credit accrual engine; this one owns the things the CME page
// surface needs around it — board-specific requirements, certificate
// rendering payloads, and renewal reminder scheduling.

import {
  type CmeBoard,
  type CmeCredit,
  type CmeLedgerSnapshot,
  type ResearchSession,
} from "@/lib/domain/provider-cme";
import { attestationHashSync } from "@/lib/domain/volunteer";

// ---------------------------------------------------------------------------
// Board-specific requirements.
// ---------------------------------------------------------------------------

export interface BoardRequirement {
  board: CmeBoard;
  /** Total CME credit hours required per cycle. */
  cycleCreditHours: number;
  /** Cycle length in months. */
  cycleMonths: number;
  /** Subset of credit hours that must be Category 1 specifically. */
  cat1MinHours: number;
  /** Optional substance-specific topic floor (e.g. opioid CE in some states). */
  topicMinimums?: Array<{ topic: string; hours: number }>;
  /** Display blurb shown on the CME page card. */
  description: string;
}

export const BOARD_REQUIREMENTS: Record<CmeBoard, BoardRequirement> = {
  AMA: {
    board: "AMA",
    cycleCreditHours: 50,
    cycleMonths: 12,
    cat1MinHours: 25,
    description: "AMA PRA: 50 credit hours per year, at least half Category 1.",
  },
  AOA: {
    board: "AOA",
    cycleCreditHours: 120,
    cycleMonths: 36,
    cat1MinHours: 30,
    description: "AOA: 120 credits over 3 years, with 30 Category 1-A.",
  },
  ACCME: {
    board: "ACCME",
    cycleCreditHours: 50,
    cycleMonths: 12,
    cat1MinHours: 50,
    description: "ACCME-accredited activity: 50 credits/year, all Category 1.",
  },
  STATE: {
    board: "STATE",
    cycleCreditHours: 40,
    cycleMonths: 24,
    cat1MinHours: 20,
    topicMinimums: [
      { topic: "controlled_substances", hours: 3 },
      { topic: "implicit_bias", hours: 2 },
    ],
    description: "Typical state medical board: 40 credits / 2 years with topical CE.",
  },
};

export interface RequirementProgress {
  board: CmeBoard;
  cycleCreditHours: number;
  earnedCreditHours: number;
  pctComplete: number;          // 0..100
  hoursRemaining: number;
  cycleEnd: string;
  metCat1Floor: boolean;
  metTopicMinimums: boolean;
  topicGaps: Array<{ topic: string; required: number; earned: number; gap: number }>;
}

function topicMatches(creditTopic: string, requirementTopic: string): boolean {
  const a = creditTopic.toLowerCase();
  const b = requirementTopic.toLowerCase().replace(/_/g, " ");
  return a.includes(b) || b.includes(a);
}

export function evaluateRequirement(input: {
  requirement: BoardRequirement;
  credits: CmeCredit[];
  cycleStart: Date;
}): RequirementProgress {
  const cycleStartMs = input.cycleStart.getTime();
  const cycleEnd = new Date(input.cycleStart);
  cycleEnd.setUTCMonth(cycleEnd.getUTCMonth() + input.requirement.cycleMonths);
  const counted = input.credits.filter(
    (c) =>
      c.status !== "voided" &&
      new Date(c.earnedAt).getTime() >= cycleStartMs &&
      new Date(c.earnedAt).getTime() <= cycleEnd.getTime(),
  );
  const earnedCreditHours = counted.reduce((s, c) => s + c.creditMinutes, 0) / 60;
  const cat1Hours = counted
    .filter((c) => c.status === "submitted" || c.status === "verified" || c.status === "earned")
    .reduce((s, c) => s + c.creditMinutes, 0) / 60;

  const topicGaps = (input.requirement.topicMinimums ?? []).map((tm) => {
    const earned =
      counted
        .filter((c) => topicMatches(c.topic, tm.topic))
        .reduce((s, c) => s + c.creditMinutes, 0) / 60;
    return { topic: tm.topic, required: tm.hours, earned, gap: Math.max(0, tm.hours - earned) };
  });

  return {
    board: input.requirement.board,
    cycleCreditHours: input.requirement.cycleCreditHours,
    earnedCreditHours,
    pctComplete: Math.min(100, (earnedCreditHours / input.requirement.cycleCreditHours) * 100),
    hoursRemaining: Math.max(0, input.requirement.cycleCreditHours - earnedCreditHours),
    cycleEnd: cycleEnd.toISOString(),
    metCat1Floor: cat1Hours >= input.requirement.cat1MinHours,
    metTopicMinimums: topicGaps.every((t) => t.gap === 0),
    topicGaps,
  };
}

// ---------------------------------------------------------------------------
// Certificate rendering payload. The page-facing surface PDFs this; we
// just produce the canonical content + verifiable hash.
// ---------------------------------------------------------------------------

export interface CmeCertificate {
  id: string;
  providerId: string;
  providerName: string;
  totalCreditHours: number;
  periodStart: string;
  periodEnd: string;
  board: CmeBoard;
  topics: string[];
  issuedAt: string;
  attestationHash: string;
  /** Sentence the provider can paste into a board attestation form. */
  attestationStatement: string;
}

export function generateCmeCertificate(input: {
  providerId: string;
  providerName: string;
  credits: CmeCredit[];
  board: CmeBoard;
  periodStart: string;
  periodEnd: string;
  now?: Date;
}): CmeCertificate {
  const eligible = input.credits.filter(
    (c) =>
      c.status !== "voided" &&
      c.earnedAt >= input.periodStart &&
      c.earnedAt <= input.periodEnd,
  );
  const totalMinutes = eligible.reduce((s, c) => s + c.creditMinutes, 0);
  const totalCreditHours = totalMinutes / 60;
  const topics = Array.from(new Set(eligible.map((c) => c.topic))).sort();
  const issuedAt = (input.now ?? new Date()).toISOString();

  const canonical = [
    input.providerId,
    input.board,
    input.periodStart,
    input.periodEnd,
    totalCreditHours.toFixed(2),
    topics.join("|"),
    issuedAt,
  ].join("::");
  const hash = attestationHashSync(canonical);

  return {
    id: `cme-cert-${hash.slice(0, 12)}`,
    providerId: input.providerId,
    providerName: input.providerName,
    totalCreditHours,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    board: input.board,
    topics,
    issuedAt,
    attestationHash: hash,
    attestationStatement: `${input.providerName} earned ${totalCreditHours.toFixed(2)} ${input.board} CME credit hours through Leafjourney research activities between ${input.periodStart.slice(0, 10)} and ${input.periodEnd.slice(0, 10)}.`,
  };
}

// ---------------------------------------------------------------------------
// Renewal reminders — schedule a cascade of nudges as the cycle deadline
// approaches. The runtime is the cron job; this function returns the
// schedule it should follow.
// ---------------------------------------------------------------------------

export type ReminderUrgency = "low" | "medium" | "high" | "critical";

export interface RenewalReminder {
  id: string;
  providerId: string;
  board: CmeBoard;
  fireAt: string;
  urgency: ReminderUrgency;
  message: string;
  hoursRemaining: number;
  daysUntilCycleEnd: number;
}

const REMINDER_OFFSETS_DAYS: Array<{ days: number; urgency: ReminderUrgency }> = [
  { days: 90, urgency: "low" },
  { days: 30, urgency: "medium" },
  { days: 14, urgency: "high" },
  { days: 3, urgency: "critical" },
];

export function scheduleRenewalReminders(input: {
  providerId: string;
  progress: RequirementProgress;
  asOf?: Date;
}): RenewalReminder[] {
  const asOf = input.asOf ?? new Date();
  const cycleEndMs = new Date(input.progress.cycleEnd).getTime();
  const reminders: RenewalReminder[] = [];

  for (const o of REMINDER_OFFSETS_DAYS) {
    const fireMs = cycleEndMs - o.days * 86_400_000;
    if (fireMs <= asOf.getTime()) continue;
    if (input.progress.pctComplete >= 100 && o.urgency !== "critical") continue;

    const daysUntilCycleEnd = Math.round((cycleEndMs - fireMs) / 86_400_000);
    reminders.push({
      id: `cme-rem-${input.providerId}-${input.progress.board}-${o.days}`,
      providerId: input.providerId,
      board: input.progress.board,
      fireAt: new Date(fireMs).toISOString(),
      urgency: o.urgency,
      hoursRemaining: input.progress.hoursRemaining,
      daysUntilCycleEnd,
      message:
        o.urgency === "critical"
          ? `URGENT: ${input.progress.hoursRemaining.toFixed(1)} CME hours due in ${daysUntilCycleEnd} days for ${input.progress.board}.`
          : `${input.progress.hoursRemaining.toFixed(1)} CME hours remain for ${input.progress.board} cycle (closes in ${daysUntilCycleEnd} days).`,
    });
  }

  return reminders.sort((a, b) => a.fireAt.localeCompare(b.fireAt));
}

// ---------------------------------------------------------------------------
// Helper: link a research participation event to a credit ID. Used by the
// research surface to "claim" a study toward CME — call this after the
// provider attests they participated in the research session.
// ---------------------------------------------------------------------------

export interface ResearchParticipation {
  providerId: string;
  studyId: string;
  participatedAt: string;
  /** Engaged minutes the provider spent on the study (reading, scoring, annotating). */
  engagedMinutes: number;
  topic: string;
}

export function linkResearchToCredit(input: {
  participation: ResearchParticipation;
  /** When set, attaches to an existing pending credit; otherwise creates a synthetic credit shell. */
  existingSessionId?: string;
}): { sessionShell: ResearchSession; creditMinutes: number } {
  const session: ResearchSession = {
    id: input.existingSessionId ?? `study-${input.participation.studyId}`,
    providerId: input.participation.providerId,
    startedAt: new Date(
      new Date(input.participation.participatedAt).getTime() - input.participation.engagedMinutes * 60_000,
    ).toISOString(),
    endedAt: input.participation.participatedAt,
    referencesViewed: 5,            // a study counts as a substantive multi-reference activity
    queryCount: 1,
    queryDepthScore: 0.9,
    topic: input.participation.topic,
  };
  // Round to 15-minute granularity (ACCME standard).
  const creditMinutes = Math.max(0, Math.round(input.participation.engagedMinutes / 15) * 15);
  return { sessionShell: session, creditMinutes };
}

// ---------------------------------------------------------------------------
// Convenience aggregator the page uses.
// ---------------------------------------------------------------------------

export interface CmePageSnapshot {
  ledger: CmeLedgerSnapshot;
  requirements: RequirementProgress[];
  upcomingReminders: RenewalReminder[];
}

export function buildCmePageSnapshot(input: {
  ledger: CmeLedgerSnapshot;
  credits: CmeCredit[];
  providerId: string;
  boards: CmeBoard[];
  cycleStart: Date;
  asOf?: Date;
}): CmePageSnapshot {
  const requirements = input.boards.map((b) =>
    evaluateRequirement({
      requirement: BOARD_REQUIREMENTS[b],
      credits: input.credits,
      cycleStart: input.cycleStart,
    }),
  );
  const upcomingReminders = requirements
    .flatMap((p) => scheduleRenewalReminders({ providerId: input.providerId, progress: p, asOf: input.asOf }))
    .sort((a, b) => a.fireAt.localeCompare(b.fireAt));

  return { ledger: input.ledger, requirements, upcomingReminders };
}
