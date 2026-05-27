// EMR-238 — Outcome Event Recorder Service.
//
// Durable, append-only log of patient/product interactions feeding the
// future ranking engine (EMR-230). Zero business logic — callers fire
// events and move on. The ranking engine reads `MarketplaceEvent` rows
// directly when it ships in v1.1; the value of this service is making
// sure the data is *being collected* from day one.
//
// Design notes:
//   * patientId is optional — events can be recorded pseudonymously
//     when the surface lacks an authenticated patient (e.g., guest
//     checkout post-MVP).
//   * The 5-second idempotency window protects against retries and
//     React strict-mode double effects without hiding real repeat
//     activity (a user actually buying the same product twice in 6
//     seconds should produce two events).
//   * recordEventAsync() is the fire-and-forget wrapper. It catches
//     and logs errors so a transient DB hiccup doesn't break checkout.
//   * In-process counter for ops visibility — not durable, just a
//     "is anything flowing through here" signal until proper metrics
//     plumbing exists.

import { Prisma, type MarketplaceEventType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export interface RecordEventInput {
  organizationId: string;
  patientId?: string | null;
  productId?: string | null;
  lotId?: string | null;
  vendorId?: string | null;
  eventType: MarketplaceEventType;
  outcomeScores?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
}

const IDEMPOTENCY_WINDOW_MS = 5_000;

const counters: Map<MarketplaceEventType, number> = new Map();

function bumpCounter(eventType: MarketplaceEventType): void {
  counters.set(eventType, (counters.get(eventType) ?? 0) + 1);
}

/**
 * Read-only snapshot of in-process counters. Resets on process restart
 * — this is a "is data flowing" signal, not a durable metrics store.
 */
export function getEventCounts(): Record<string, number> {
  return Object.fromEntries(counters);
}

/**
 * Record a marketplace event durably. Awaitable. Idempotent over a
 * 5-second window on the (patientId, productId, eventType) tuple to
 * absorb retries and double-fire effects. Returns the event id (newly
 * created or matched).
 */
export async function recordEvent(input: RecordEventInput): Promise<string> {
  const since = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS);

  // Idempotency: only suppress if the same (patient, product, type)
  // tuple was logged within the window. Pseudonymous events
  // (no patientId) are never deduped by patient — they go through.
  if (input.patientId) {
    const recent = await prisma.marketplaceEvent.findFirst({
      where: {
        patientId: input.patientId,
        productId: input.productId ?? null,
        eventType: input.eventType,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (recent) return recent.id;
  }

  const event = await prisma.marketplaceEvent.create({
    data: {
      organizationId: input.organizationId,
      patientId: input.patientId ?? null,
      productId: input.productId ?? null,
      lotId: input.lotId ?? null,
      vendorId: input.vendorId ?? null,
      eventType: input.eventType,
      outcomeScores: input.outcomeScores ?? Prisma.JsonNull,
      metadata: input.metadata ?? Prisma.JsonNull,
    },
    select: { id: true },
  });

  bumpCounter(input.eventType);
  return event.id;
}

/**
 * Fire-and-forget wrapper. The caller does not block on the write or
 * its failure. Use this from request paths where event recording is
 * incidental (checkout, regimen lifecycle hooks). Errors are logged
 * but never thrown — the calling request must succeed regardless of
 * whether telemetry landed.
 */
export function recordEventAsync(input: RecordEventInput): void {
  void recordEvent(input).catch((err: unknown) => {
    // Intentional console.error: this is the ops signal until a
    // structured logger is wired in.
    // eslint-disable-next-line no-console
    console.error("[event-recorder] failed to record event", {
      eventType: input.eventType,
      organizationId: input.organizationId,
      productId: input.productId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

/**
 * Helper for batch recording (e.g., one purchase order with N items
 * → N purchase events). Each item gets its own row so the ranking
 * engine can attribute outcomes per product. Idempotency still
 * applies per row.
 */
export async function recordEventBatch(
  inputs: ReadonlyArray<RecordEventInput>,
): Promise<string[]> {
  const ids: string[] = [];
  for (const input of inputs) {
    ids.push(await recordEvent(input));
  }
  return ids;
}

