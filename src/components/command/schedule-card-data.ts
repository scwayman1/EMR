import { prisma } from "@/lib/db/prisma";

/**
 * Schedule-card enrichment loader.
 *
 * One call per data type, filtered by patientId IN (...) — so a tile
 * rendering 12 appointments does 7 queries total, not 7 × 12.
 *
 * All fields are optional/nullable. The card gracefully omits any
 * piece of data that isn't available, so a brand-new patient with no
 * history still renders a readable card (just a thinner one).
 */

export type ChipTone = "danger" | "warn" | "info" | "success";

export interface ScheduleChip {
  emoji: string;
  label: string;
  tone: ChipTone;
}

export type TrendDirection = "up" | "down" | "flat";

export interface ScheduleEnrichment {
  /** Chief complaint / reason for the visit. */
  reason: string | null;
  /** One-sentence pre-visit brief. Derived from Encounter.briefingContext
   *  when preVisitIntelligence has run, else composed from the top
   *  open observation / concern memory as a best-effort fallback. */
  briefLine: string | null;
  /** Pain trend direction over the last 30 days, or null if <2 logs. */
  painTrend: TrendDirection | null;
  /** Adherence over the last 7 days, as a percentage 0–100, or null
   *  if the patient has no active regimen. */
  adherencePct: number | null;
  /** Signal chips — allergy / refill / abnormal lab / concern. */
  chips: ScheduleChip[];
}

function emptyEnrichment(): ScheduleEnrichment {
  return {
    reason: null,
    briefLine: null,
    painTrend: null,
    adherencePct: null,
    chips: [],
  };
}

/**
 * Run a Prisma query and swallow + log any failure. The Schedule tile
 * has nine independent enrichment queries; if any one of them throws
 * (a missing table after schema drift, a Prisma client mismatch, an
 * enum-in-where surprise) the whole tile falls back to its error
 * body — even though the other eight queries would have been fine.
 *
 * Wrapping each query individually lets the tile degrade gracefully:
 * the failing piece returns an empty array, the others render their
 * data, and the failure is logged so Render shows it in the stack
 * trace without us having to chase it via per-tile fallbacks.
 */
async function safeQuery<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[command-center] schedule enrichment "${label}" failed:`, err);
    return [];
  }
}

/**
 * Load enrichment for a batch of patients. Returns a Map from patientId
 * to its enrichment record. Patients with no data still get an entry
 * (all fields null / empty chips) so the caller can use `.get()` without
 * null-checks.
 */
export async function loadScheduleEnrichment(
  patientIds: string[]
): Promise<Map<string, ScheduleEnrichment>> {
  if (patientIds.length === 0) return new Map();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const [
    patients,
    encounters,
    painLogs,
    regimens,
    doseLogs,
    pendingRefills,
    abnormalLabs,
    concernObservations,
    concernMemories,
  ] = await Promise.all([
    safeQuery("patients", () =>
      prisma.patient.findMany({
        where: { id: { in: patientIds } },
        select: { id: true, allergies: true },
      })
    ),
    safeQuery("encounters", () =>
      prisma.encounter.findMany({
        where: {
          patientId: { in: patientIds },
          scheduledFor: { gte: todayStart, lt: tomorrowStart },
        },
        orderBy: { scheduledFor: "asc" },
        select: {
          patientId: true,
          reason: true,
          briefingContext: true,
        },
      })
    ),
    safeQuery("painLogs", () =>
      prisma.outcomeLog.findMany({
        where: {
          patientId: { in: patientIds },
          metric: "pain",
          loggedAt: { gte: thirtyDaysAgo },
        },
        orderBy: { loggedAt: "asc" },
        select: { patientId: true, value: true, loggedAt: true },
      })
    ),
    safeQuery("regimens", () =>
      prisma.dosingRegimen.findMany({
        where: { patientId: { in: patientIds }, active: true },
        select: { patientId: true, frequencyPerDay: true },
      })
    ),
    safeQuery("doseLogs", () =>
      prisma.doseLog.findMany({
        where: {
          patientId: { in: patientIds },
          loggedAt: { gte: sevenDaysAgo },
        },
        select: { patientId: true },
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
    safeQuery("abnormalLabs", () =>
      prisma.labResult.findMany({
        where: { patientId: { in: patientIds }, abnormalFlag: true },
        orderBy: { receivedAt: "desc" },
        select: { patientId: true, panelName: true },
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
    safeQuery("concernMemories", () =>
      prisma.patientMemory.findMany({
        where: {
          patientId: { in: patientIds },
          kind: "concern",
          validUntil: null,
          supersededById: null,
        },
        orderBy: { updatedAt: "desc" },
        select: { patientId: true, content: true },
      })
    ),
  ]);

  const out = new Map<string, ScheduleEnrichment>();
  for (const id of patientIds) out.set(id, emptyEnrichment());

  // allergies — null-guard because legacy rows may have allergies=NULL
  // despite the schema default (default applies at write time, not to
  // pre-existing data).
  for (const p of patients) {
    const e = out.get(p.id);
    if (!e) continue;
    const allergies = p.allergies ?? [];
    if (allergies.length > 0) {
      e.chips.push({
        emoji: "⚠",
        label: allergies.length === 1 ? allergies[0] : `${allergies.length} allergies`,
        tone: "danger",
      });
    }
  }

  // today's encounter
  for (const enc of encounters) {
    const e = out.get(enc.patientId);
    if (!e) continue;
    if (!e.reason && enc.reason) e.reason = enc.reason;
    // briefingContext shape is {patientSummary, talkingPoints[], ...}
    // Prefer patientSummary when present.
    if (!e.briefLine && enc.briefingContext && typeof enc.briefingContext === "object") {
      const ctx = enc.briefingContext as { patientSummary?: unknown };
      if (typeof ctx.patientSummary === "string" && ctx.patientSummary.trim()) {
        e.briefLine = ctx.patientSummary.trim();
      }
    }
  }

  // pain trend: first vs latest
  const painByPatient = new Map<string, { value: number; loggedAt: Date }[]>();
  for (const log of painLogs) {
    const arr = painByPatient.get(log.patientId) ?? [];
    arr.push({ value: log.value, loggedAt: log.loggedAt });
    painByPatient.set(log.patientId, arr);
  }
  for (const [pid, logs] of painByPatient) {
    if (logs.length < 2) continue;
    const first = logs[0].value;
    const last = logs[logs.length - 1].value;
    const delta = last - first;
    const enrich = out.get(pid);
    if (!enrich) continue;
    // Pain is inverted — lower is better. Direction = clinical direction.
    if (delta <= -1) enrich.painTrend = "down"; // pain dropping → improving
    else if (delta >= 1) enrich.painTrend = "up"; // pain rising → worsening
    else enrich.painTrend = "flat";
  }

  // adherence: actual doses / expected doses over last 7 days
  const expectedByPatient = new Map<string, number>();
  for (const r of regimens) {
    const cur = expectedByPatient.get(r.patientId) ?? 0;
    expectedByPatient.set(r.patientId, cur + r.frequencyPerDay * 7);
  }
  const actualByPatient = new Map<string, number>();
  for (const log of doseLogs) {
    actualByPatient.set(
      log.patientId,
      (actualByPatient.get(log.patientId) ?? 0) + 1
    );
  }
  for (const [pid, expected] of expectedByPatient) {
    if (expected === 0) continue;
    const enrich = out.get(pid);
    if (!enrich) continue;
    const actual = actualByPatient.get(pid) ?? 0;
    enrich.adherencePct = Math.min(100, Math.round((actual / expected) * 100));
  }

  // refill chip
  const refillSeen = new Set<string>();
  for (const r of pendingRefills) {
    if (refillSeen.has(r.patientId)) continue;
    refillSeen.add(r.patientId);
    const enrich = out.get(r.patientId);
    if (enrich) {
      enrich.chips.push({ emoji: "💊", label: "refill", tone: "info" });
    }
  }

  // abnormal lab chip
  const labSeen = new Set<string>();
  for (const lab of abnormalLabs) {
    if (labSeen.has(lab.patientId)) continue;
    labSeen.add(lab.patientId);
    const enrich = out.get(lab.patientId);
    if (enrich) {
      enrich.chips.push({ emoji: "🔬", label: "abnormal lab", tone: "warn" });
    }
  }

  // observation chip + fallback brief
  const obsSeen = new Set<string>();
  for (const obs of concernObservations) {
    if (obsSeen.has(obs.patientId)) continue;
    obsSeen.add(obs.patientId);
    const enrich = out.get(obs.patientId);
    if (!enrich) continue;
    enrich.chips.push({
      emoji: obs.severity === "urgent" ? "🚨" : "⚠️",
      label: obs.severity === "urgent" ? "urgent" : "concern",
      tone: obs.severity === "urgent" ? "danger" : "warn",
    });
    if (!enrich.briefLine && obs.summary) enrich.briefLine = obs.summary;
  }

  // concern memory → last-resort brief
  const memSeen = new Set<string>();
  for (const mem of concernMemories) {
    if (memSeen.has(mem.patientId)) continue;
    memSeen.add(mem.patientId);
    const enrich = out.get(mem.patientId);
    if (!enrich) continue;
    if (!enrich.briefLine && mem.content) {
      enrich.briefLine = truncate(mem.content, 140);
    }
  }

  return out;
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Featured-appointment snapshot — the "walking into the room" payload
 * that used to live in PatientSnapshotTile. Loaded for one patient
 * (the next-upcoming visit) so hovering the featured Schedule card
 * reveals the full pre-visit facesheet without a dedicated tile.
 */
export interface FeaturedSnapshot {
  allergies: string[];
  activeMedCount: number;
  latestLab: {
    panelName: string;
    receivedAt: Date;
    abnormalFlag: boolean;
  } | null;
}

export async function loadFeaturedSnapshot(
  patientId: string
): Promise<FeaturedSnapshot | null> {
  const [patient, activeMeds, latestLab] = await Promise.all([
    prisma.patient
      .findUnique({
        where: { id: patientId },
        select: { allergies: true },
      })
      .catch(() => null),
    prisma.patientMedication
      .count({ where: { patientId, active: true } })
      .catch(() => 0),
    prisma.labResult
      .findFirst({
        where: { patientId },
        orderBy: { receivedAt: "desc" },
        select: { panelName: true, receivedAt: true, abnormalFlag: true },
      })
      .catch(() => null),
  ]);

  if (!patient) return null;
  return {
    allergies: patient.allergies ?? [],
    activeMedCount: activeMeds,
    latestLab,
  };
}
