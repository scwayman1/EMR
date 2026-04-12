import type { Agent } from "@/lib/orchestration/types";
import { intakeAgent } from "./intake-agent";
import { documentOrganizerAgent } from "./document-organizer-agent";
import { outcomeTrackerAgent } from "./outcome-tracker-agent";
import { scribeAgent } from "./scribe-agent";
import { researchAgent } from "./research-agent";
import { messagingAssistantAgent } from "./messaging-assistant-agent";
import { codingReadinessAgent } from "./coding-readiness-agent";
import { practiceLaunchAgent } from "./practice-launch-agent";
import { registryAgent } from "./registry-agent";
import { schedulingAgent } from "./scheduling-agent";
import { physicianNudgeAgent } from "./physician-nudge-agent";
import { patientOutreachAgent } from "./patient-outreach-agent";
import { preVisitIntelligenceAgent } from "./pre-visit-intelligence-agent";
import { fairytaleSummaryAgent } from "./fairytale-summary-agent";
import { correspondenceNurseAgent } from "./correspondence-nurse-agent";
// Billing agents — Phase 3 of the Revenue Cycle PRD
import { chargeIntegrityAgent } from "./billing/charge-integrity-agent";
import { denialTriageAgent } from "./billing/denial-triage-agent";
import { patientExplanationAgent } from "./billing/patient-explanation-agent";
import { patientCollectionsAgent } from "./billing/patient-collections-agent";
import { reconciliationAgent } from "./billing/reconciliation-agent";
import { agingAgent } from "./billing/aging-agent";
import { underpaymentDetectionAgent } from "./billing/underpayment-detection-agent";
// Phase 4
import { refundCreditAgent } from "./billing/refund-credit-agent";
import { revenueCommandAgent } from "./billing/revenue-command-agent";
// RCM Fleet — Phase 5 (pre-submission pipeline)
import { encounterIntelligenceAgent } from "./billing/encounter-intelligence-agent";
import { codingOptimizationAgent } from "./billing/coding-optimization-agent";
import { claimConstructionAgent } from "./billing/claim-construction-agent";
// RCM Fleet — Phase 7 (post-adjudication loop)
import { adjudicationInterpretationAgent } from "./billing/adjudication-interpretation-agent";
import { appealsGenerationAgent } from "./billing/appeals-generation-agent";

/**
 * Registry of all agents. Adding an agent = new file + one line here +
 * a workflow definition in src/lib/orchestration/workflows.ts.
 */
export const agentRegistry = {
  // Clinical agents
  intake: intakeAgent,
  documentOrganizer: documentOrganizerAgent,
  outcomeTracker: outcomeTrackerAgent,
  scribe: scribeAgent,
  researchSynthesizer: researchAgent,
  messagingAssistant: messagingAssistantAgent,
  codingReadiness: codingReadinessAgent,
  practiceLaunch: practiceLaunchAgent,
  registry: registryAgent,
  scheduling: schedulingAgent,
  physicianNudge: physicianNudgeAgent,
  patientOutreach: patientOutreachAgent,
  preVisitIntelligence: preVisitIntelligenceAgent,
  fairytaleSummary: fairytaleSummaryAgent,
  correspondenceNurse: correspondenceNurseAgent,
  // Billing agents (Phase 3)
  chargeIntegrity: chargeIntegrityAgent,
  denialTriage: denialTriageAgent,
  patientExplanation: patientExplanationAgent,
  patientCollections: patientCollectionsAgent,
  reconciliation: reconciliationAgent,
  aging: agingAgent,
  underpaymentDetection: underpaymentDetectionAgent,
  // Billing agents (Phase 4)
  refundCredit: refundCreditAgent,
  revenueCommand: revenueCommandAgent,
  // RCM Fleet — Phase 5 (pre-submission pipeline)
  encounterIntelligence: encounterIntelligenceAgent,
  codingOptimization: codingOptimizationAgent,
  claimConstruction: claimConstructionAgent,
  // RCM Fleet — Phase 7 (post-adjudication loop)
  adjudicationInterpretation: adjudicationInterpretationAgent,
  appealsGeneration: appealsGenerationAgent,
} satisfies Record<string, Agent<any, any>>;

export type AgentName = keyof typeof agentRegistry;

export const agentList = Object.values(agentRegistry);

/** Agents tagged as "billing" — used by the billing oversight console. */
export const BILLING_AGENT_NAMES: AgentName[] = [
  "encounterIntelligence",
  "codingOptimization",
  "claimConstruction",
  "adjudicationInterpretation",
  "appealsGeneration",
  "chargeIntegrity",
  "denialTriage",
  "patientExplanation",
  "patientCollections",
  "reconciliation",
  "aging",
  "underpaymentDetection",
  "refundCredit",
  "revenueCommand",
];
