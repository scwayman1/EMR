import { prisma } from "@/lib/db/prisma";

/**
 * Messages-card enrichment loader.
 *
 * One batched query per data type, filtered by patientId IN (...) — so a
 * tile rendering 6 message threads does 5 queries total, not 5 × 6.
 *
 * All fields are optional/nullable. The tile gracefully omits any piece
 * of data that isn't available, so a thread for a brand-new patient with
 * no history still renders a readable row (just a thinner one).
 *
 * This mirrors the shape of schedule-card-data.ts on purpose — the two
 * tiles sit side-by-side in the Command Center, and sharing the chip /
 * safeQuery / Map<patientId, …> pattern makes them feel like one system.
 */

export type ChipTone = "danger" | "warn" | "info" | "success";

export interface MessagesChip {
  emoji: string;
  label: string;
  tone: ChipTone;
}

/**
 * Sentiment emoji derived from the most recent OutcomeLog(metric="mood").
 *  1–3 → 😞 (low / struggling)
 *  4–6 → 😐 (neutral / mixed)
 *  7–10 → 😊 (doing well)
 */
export type SentimentEmoji = "😞" | "😐" | "😊";

export interface MessagesEnrichment {
  /** Sentiment emoji from most recent mood check-in; null if never logged. */
  sentiment: SentimentEmoji | null;
  /** Raw mood value (0-10) behind the sentiment emoji, for tooltip context. */
  moodValue: number | null;
  /** Highest-priority open clinical observation summary, as a fallback
   *  "why this row matters" line when the triage summary is thin. */
  observationSummary: string | null;
  /** Patient allergies (null-guarded). Rendered as a danger chip. */
  allergies: string[];
  /** Signal chips — urgent / concern / refill / unsigned lab. */
  chips: MessagesChip[];
}

function emptyEnrichment(): MessagesEnrichment {
  return {
    sentiment: null,
    moodValue: null,
    observationSummary: null,
    allergies: [],
    chips: [],
  };
}

/**
 * Run a Prisma query and swallow + log any failure. The Messages tile has
 * five independent enrichment queries; if any one of them throws (a
 * schema drift, a Prisma client mismatch, an enum-in-where surprise) the
 * whole tile would fall back to its error body — even though the other
 * four queries would have been fine.
 *
 * Wrapping each query individually lets the tile degrade gracefully: the
 * failing piece returns an empty array, the others render their data,
 * and the failure is logged so Render shows it in the stack trace.
 */
async function safeQuery<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[command-center] messages enrichment "${label}" failed:`, err);
    return [];
  }
}

/**
 * Load enrichment for a batch of patients. Returns a Map from patientId
 * to its enrichment record. Patients with no data still get an entry
 * (all fields null / empty chips) so the caller can use `.get()` without
 * null-checks.
 */
export async function loadMessagesEnrichment(
  patientIds: string[]
): Promise<Map<string, MessagesEnrichment>> {
  if (patientIds.length === 0) return new Map();

  const [
    patients,
    moodLogs,
    concernObservations,
    pendingRefills,
    unsignedLabs,
  ] = await Promise.all([
    safeQuery("patients", () =>
      prisma.patient.findMany({
        where: { id: { in: patientIds } },
        select: { id: true, allergies: true },
      })
    ),
    safeQuery("moodLogs", () =>
      prisma.outcomeLog.findMany({
        where: {
          patientId: { in: patientIds },
          metric: "mood",
        },
        orderBy: { loggedAt: "desc" },
        select: { patientId: true, value: true, loggedAt: true },
      })
    ),
    safeQuery("concernObservations", () =>
      prisma.clinicalObservation.findMany({
        where: {
          patientId: { in: patientIds },
          severity: { in: ["urgent", "concern"] },
          resolvedAt: null,
        },
        // Sort by createdAt only; some Prisma versions reject orderBy
        // on enum fields, and recency is the right tiebreaker anyway.
        orderBy: { createdAt: "desc" },
        select: {
          patientId: true,
          severity: true,
          summary: true,
        },
      })
    ),
    safeQuery("pendingRefills", () =>
      prisma.refillRequest.findMany({
        where: {
          patientId: { in: patientIds },
          status: { in: ["new", "flagged"] },
        },
        select: { patientId: true },
      })
    ),
    safeQuery("unsignedLabs", () =>
      prisma.labResult.findMany({
        where: {
          patientId: { in: patientIds },
          signedAt: null,
        },
        select: { patientId: true },
      })
    ),
  ]);

  const out = new Map<string, MessagesEnrichment>();
  for (const id of patientIds) out.set(id, emptyEnrichment());

  // allergies — null-guard because legacy rows may have allergies=NULL
  // despite the schema default (default applies at write time, not to
  // pre-existing data).
  for (const p of patients) {
    const e = out.get(p.id);
    if (!e) continue;
    const allergies = p.allergies ?? [];
    if (allergies.length > 0) {
      e.allergies = allergies;
      e.chips.push({
        emoji: "⚠",
        label: allergies.length === 1 ? allergies[0] : `${allergies.length} allergies`,
        tone: "danger",
      });
    }
  }

  // sentiment: map most recent mood log per patient → 1-3/4-6/7-10 buckets.
  const moodSeen = new Set<string>();
  for (const log of moodLogs) {
    if (moodSeen.has(log.patientId)) continue;
    moodSeen.add(log.patientId);
    const e = out.get(log.patientId);
    if (!e) continue;
    e.moodValue = log.value;
    if (log.value <= 3) e.sentiment = "😞";
    else if (log.value <= 6) e.sentiment = "😐";
    else e.sentiment = "😊";
  }

  // observation chip — and observationSummary as a fallback "why" line.
  const obsSeen = new Set<string>();
  for (const obs of concernObservations) {
    if (obsSeen.has(obs.patientId)) continue;
    obsSeen.add(obs.patientId);
    const e = out.get(obs.patientId);
    if (!e) continue;
    e.chips.push({
      emoji: obs.severity === "urgent" ? "🚨" : "⚠️",
      label: obs.severity === "urgent" ? "urgent" : "concern",
      tone: obs.severity === "urgent" ? "danger" : "warn",
    });
    if (!e.observationSummary && obs.summary) e.observationSummary = obs.summary;
  }

  // pending refill count → chip
  const refillCounts = new Map<string, number>();
  for (const r of pendingRefills) {
    refillCounts.set(r.patientId, (refillCounts.get(r.patientId) ?? 0) + 1);
  }
  for (const [pid, count] of refillCounts) {
    const e = out.get(pid);
    if (!e) continue;
    e.chips.push({
      emoji: "💊",
      label: count === 1 ? "refill" : `${count} refills`,
      tone: "info",
    });
  }

  // unsigned lab count → chip
  const labCounts = new Map<string, number>();
  for (const lab of unsignedLabs) {
    labCounts.set(lab.patientId, (labCounts.get(lab.patientId) ?? 0) + 1);
  }
  for (const [pid, count] of labCounts) {
    const e = out.get(pid);
    if (!e) continue;
    e.chips.push({
      emoji: "🔬",
      label: count === 1 ? "unsigned lab" : `${count} unsigned labs`,
      tone: "warn",
    });
  }

  return out;
}
