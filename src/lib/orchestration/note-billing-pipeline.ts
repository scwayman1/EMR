import { dispatch } from "./dispatch";
import type { DomainEvent } from "./events";

// ---------------------------------------------------------------------------
// Multi-Agent Billing Pipeline (EMR-045)
// ---------------------------------------------------------------------------
// Convenience wrapper around the dispatcher. Either:
//
//   1. callers fire `dispatch({ name: "note.billing.review.requested", ... })`
//      and the workflow engine enqueues the noteCoding job, which on
//      completion emits note.coding.complete and triggers the
//      noteComplianceAudit job (fan-through pattern), or
//
//   2. callers use `runNoteBillingPipeline()` to enqueue the entry-point
//      event programmatically.
//
// The asynchronous fan-through is the idiomatic path because it shares the
// AgentJob queue, audit, and approval-gating machinery with the rest of
// the agent fleet. The synchronous path is for tests and the ops console.
// ---------------------------------------------------------------------------

export interface NoteBillingPipelineInput {
  noteId: string;
  encounterId: string;
  patientId: string;
  organizationId: string;
}

/**
 * Enqueue the entry-point event for the note → coding → compliance pipeline.
 * Returns the AgentJob id(s) created by the dispatcher.
 */
export async function runNoteBillingPipeline(
  input: NoteBillingPipelineInput,
): Promise<string[]> {
  const event: DomainEvent = {
    name: "note.billing.review.requested",
    noteId: input.noteId,
    encounterId: input.encounterId,
    patientId: input.patientId,
    organizationId: input.organizationId,
  };
  return dispatch(event);
}
