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

/**
 * Registry of all agents. Adding an agent = new file + one line here +
 * a workflow definition in src/lib/orchestration/workflows.ts.
 */
export const agentRegistry = {
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
} satisfies Record<string, Agent<any, any>>;

export type AgentName = keyof typeof agentRegistry;

export const agentList = Object.values(agentRegistry);
