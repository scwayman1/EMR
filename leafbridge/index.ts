// LeafBridge — Trust + AI Orchestration Layer
//
// Three modules ship together because they form a single chokepoint
// for every PHI access in the platform:
//
//   • consent-policy-gateway  — Module 5 / EMR-767 — policy + consent
//   • clinical-rag-service    — Module 7 / EMR-769 — grounded context
//   • agent-orchestrator      — Module 6 / EMR-768 — agent OS
//
// Everything is in-memory and side-effect-free at MVP. Production
// wires the stores + queues to Postgres / FHIR / pgvector / a real
// human-review UI; the public APIs do not change.

export * as Shared from "./shared";
export * as ConsentPolicy from "./consent-policy-gateway";
export * as ClinicalRag from "./clinical-rag-service";
export * as AgentOrchestrator from "./agent-orchestrator";
