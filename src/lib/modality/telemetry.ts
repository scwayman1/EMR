/**
 * Modality telemetry — EMR-441
 *
 * Records `modality.rejected` events whenever the API guard refuses a request
 * because the requested modality is off for the practice. The event is the
 * primary signal we hand to on-call to detect mis-configured tenants and to
 * the product team to detect features that need a discoverable upsell flow.
 *
 * Design choice: structured JSON via `logger.warn` rather than a dedicated DB
 * table. We get the rejection signal in our log aggregator immediately and
 * avoid coupling the API-guard latency to a write. Move to a DB table only if
 * compliance demands persisted retention; the helper's call-site stays the
 * same so the swap is mechanical.
 *
 * Wire shape (matches what aggregators grep on):
 *   { event: "modality.rejected", practiceId, modality, route, timestamp }
 */

import "server-only";

import { logger } from "@/lib/observability/log";
import type { ModalityId } from "@/lib/modality/registry";

export interface ModalityRejectionEvent {
  /** Practice the request was scoped to. May be empty string for unscoped routes. */
  practiceId: string;
  /** The modality slug the request required. */
  modality: ModalityId;
  /**
   * The route that produced the rejection. For HTTP routes this is the
   * request pathname; for server actions it's `action:<name>`.
   */
  route: string;
  /** ISO-8601 timestamp. Defaults to `new Date().toISOString()`. */
  timestamp?: string;
}

/**
 * Emit a structured `modality.rejected` event. Always returns synchronously —
 * the underlying logger is non-blocking. Never throws (logging failures are
 * swallowed by `logger.warn`).
 */
export function recordModalityRejection(event: ModalityRejectionEvent): void {
  logger.warn({
    event: "modality.rejected",
    practiceId: event.practiceId,
    modality: event.modality,
    route: event.route,
    timestamp: event.timestamp ?? new Date().toISOString(),
  });
}
