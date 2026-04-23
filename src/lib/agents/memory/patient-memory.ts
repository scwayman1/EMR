/**
 * Patient Memory — the agentic harness's long-term understanding of a person.
 *
 * This module is the read/write interface every agent should use when it
 * wants to know "what do we already know about this patient" or "we just
 * learned something new about this patient." Raw Prisma access is allowed
 * but discouraged — go through these helpers so queries are consistent,
 * validity windows are respected, and every read/write gets logged.
 *
 * Design principles:
 *
 *   1. Memories are narrative, not structured.
 *      Instead of { sleepHours: 7, pain: 4 }, we write
 *      "Sleep improved from ~5h to ~7h since starting CBN 5mg at night,
 *      and pain is consistently reported in the 3-4/10 range on the
 *      current regimen." Structured data already lives in OutcomeLog and
 *      DosingRegimen; memories capture the *interpretation*.
 *
 *   2. Memories are versioned, not mutated.
 *      When something changes, we write a new memory and mark the old
 *      one as superseded. That way the chart's history is preserved and
 *      we can see how our understanding of a patient evolved over time.
 *
 *   3. Memories have confidence and validity.
 *      Not everything we notice is certain, and not everything stays
 *      true forever. Agents should lower their confidence when they're
 *      inferring and set validUntil when they know something has changed.
 *
 *   4. Every agent writes memories in the patient's voice when possible.
 *      "Maya prefers..." reads better than "Patient demonstrates tendency
 *      to prefer...". We're building warmth, not a differential diagnosis.
 */

import { prisma } from "@/lib/db/prisma";
import type { MemoryKind, PatientMemory } from "@prisma/client";

/** What a caller passes when recording a new memory. */
export interface RecordMemoryInput {
  patientId: string;
  kind: MemoryKind;
  content: string;
  confidence?: number;
  tags?: string[];
  /** Agent name (e.g. "correspondenceNurse") or user id. */
  source: string;
  /** Distinguishes agent-written memories from user-written. */
  sourceKind: "agent" | "user";
  /** If this memory replaces an existing one, pass its id. */
  supersedesId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Record a new memory. If supersedesId is provided, the prior memory is
 * marked invalid as of now and linked to the new one. All writes are
 * transactional — you'll never see a half-superseded memory.
 */
export async function recordMemory(
  input: RecordMemoryInput,
): Promise<PatientMemory> {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const created = await tx.patientMemory.create({
      data: {
        patientId: input.patientId,
        kind: input.kind,
        content: input.content.trim(),
        confidence: clamp01(input.confidence ?? 0.8),
        tags: input.tags ?? [],
        source: input.source,
        sourceKind: input.sourceKind,
        metadata: (input.metadata ?? null) as any,
      },
    });
    if (input.supersedesId) {
      await tx.patientMemory.update({
        where: { id: input.supersedesId },
        data: {
          validUntil: now,
          supersededById: created.id,
        },
      });
    }
    return created;
  });
}

/** Options for `recallMemories`. */
export interface RecallOptions {
  /** Filter by memory kind. Omit to return all kinds. */
  kinds?: MemoryKind[];
  /** Filter by tag overlap. Any match returns the memory. */
  tags?: string[];
  /** If true, include memories that have been superseded. Default false. */
  includeSuperseded?: boolean;
  /** Max results to return. Default 50. */
  limit?: number;
}

/**
 * Recall the currently-valid memories for a patient, newest first. This
 * is the query every agent should make right before it drafts anything
 * patient-facing.
 */
export async function recallMemories(
  patientId: string,
  options: RecallOptions = {},
): Promise<PatientMemory[]> {
  const where: any = { patientId };
  if (!options.includeSuperseded) {
    where.validUntil = null;
  }
  if (options.kinds && options.kinds.length > 0) {
    where.kind = { in: options.kinds };
  }
  if (options.tags && options.tags.length > 0) {
    where.tags = { hasSome: options.tags };
  }
  return prisma.patientMemory.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 50,
  });
}

/**
 * Render a set of memories as a compact prompt block that can be pasted
 * into an LLM system message. Keep it short and structured — agents are
 * already paying a per-token cost.
 */
export function formatMemoriesForPrompt(memories: PatientMemory[]): string {
  if (memories.length === 0) {
    return "(no persistent memories recorded yet — this is an early interaction)";
  }
  const groups = new Map<string, PatientMemory[]>();
  for (const m of memories) {
    const bucket = groups.get(m.kind) ?? [];
    bucket.push(m);
    groups.set(m.kind, bucket);
  }
  const order: MemoryKind[] = [
    "concern",
    "working",
    "not_working",
    "preference",
    "trajectory",
    "observation",
    "relationship",
    "context",
    "milestone",
  ];
  const lines: string[] = [];
  for (const kind of order) {
    const bucket = groups.get(kind as any);
    if (!bucket || bucket.length === 0) continue;
    lines.push(`\n[${LABELS[kind as MemoryKind] ?? kind}]`);
    for (const m of bucket) {
      lines.push(`  · ${m.content}`);
    }
  }
  return lines.join("\n").trim();
}

const LABELS: Record<MemoryKind, string> = {
  preference: "What this patient prefers",
  observation: "What we've noticed",
  trajectory: "How things are trending",
  relationship: "People in their life",
  context: "Background we keep in mind",
  milestone: "Key moments",
  working: "What's working for them",
  not_working: "What hasn't worked",
  concern: "Ongoing concerns",
};

/**
 * Mark a memory no longer valid (without replacing it). Useful when a
 * patient tells us "I don't feel that way anymore" or an intervention
 * clearly stopped helping.
 */
export async function invalidateMemory(
  memoryId: string,
  source: string,
  sourceKind: "agent" | "user",
): Promise<void> {
  await prisma.patientMemory.update({
    where: { id: memoryId },
    data: {
      validUntil: new Date(),
      metadata: {
        invalidatedBy: source,
        invalidatedByKind: sourceKind,
        invalidatedAt: new Date().toISOString(),
      },
    },
  });
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.8;
  return Math.min(1, Math.max(0, n));
}
