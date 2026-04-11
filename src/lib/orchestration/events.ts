// Strongly-typed domain events. Dispatching an event is how the rest of the
// codebase talks to the orchestration layer — nothing else.

export type DomainEvent =
  | { name: "patient.created"; patientId: string; organizationId: string }
  | { name: "patient.intake.updated"; patientId: string; organizationId: string }
  | { name: "patient.intake.submitted"; patientId: string; organizationId: string }
  | { name: "patient.intake.stalled"; patientId: string; organizationId: string; intent: string }
  | { name: "patient.diagnosis.updated"; patientId: string; organizationId: string }
  | { name: "document.uploaded"; documentId: string; patientId: string; organizationId: string }
  | { name: "document.classified"; documentId: string }
  | { name: "assessment.assigned"; patientId: string; assessmentSlug: string }
  | { name: "assessment.submitted"; responseId: string; patientId: string }
  | { name: "encounter.scheduled"; encounterId: string; patientId: string }
  | { name: "encounter.started"; encounterId: string }
  | { name: "encounter.completed"; encounterId: string; patientId: string; completedAt: Date }
  | { name: "encounter.note.draft.requested"; encounterId: string; requestedBy: string }
  | { name: "note.finalized"; noteId: string; encounterId: string; finalizedBy: string }
  | { name: "message.draft.requested"; patientId: string; intent: string; organizationId: string }
  | { name: "message.sent"; messageId: string; threadId: string }
  | { name: "appointment.created"; appointmentId: string }
  | { name: "appointment.cancelled"; appointmentId: string }
  | { name: "research.query.submitted"; queryId: string; query: string; patientId?: string }
  | { name: "practice.onboarding.started"; organizationId: string }
  // Billing events — Phase 3
  | { name: "claim.created"; claimId: string; organizationId: string; patientId: string }
  | { name: "claim.submitted"; claimId: string; organizationId: string }
  | { name: "claim.denied"; claimId: string; organizationId: string; patientId: string }
  | { name: "claim.paid"; claimId: string; organizationId: string; patientId: string }
  | { name: "payment.received"; paymentId: string; claimId: string; organizationId: string }
  | { name: "statement.generated"; statementId: string; patientId: string; organizationId: string }
  | { name: "billing.aging.sweep"; organizationId: string }
  | { name: "billing.reconciliation.run"; organizationId: string }
  | { name: "billing.underpayment.scan"; organizationId: string }
  | { name: "billing.credit.scan"; organizationId: string }
  | { name: "billing.command.brief"; organizationId: string };

export type EventName = DomainEvent["name"];
export type EventOf<N extends EventName> = Extract<DomainEvent, { name: N }>;
