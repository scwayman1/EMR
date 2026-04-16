import type { z } from "zod";

/** Actions an agent may perform. Enforced by the agent context, not convention. */
export type AllowedAction =
  | "read.patient"
  | "read.encounter"
  | "read.document"
  | "read.note"
  | "read.research"
  | "write.chartSummary"
  | "write.document.metadata"
  | "write.note.draft"
  | "write.message.draft"
  | "write.task"
  | "write.coding"
  | "write.qualification"
  | "write.outcome.reminder"
  | "write.launchStatus"
  | "read.productPrompt"
  | "write.productPrompt";

export interface AgentLogEntry {
  at: string; // ISO timestamp
  level: "info" | "warn" | "error";
  message: string;
  data?: Record<string, unknown>;
}

export interface AgentContext {
  /** The job row id that invoked this agent. */
  jobId: string;
  /** Organization scope, if any. */
  organizationId: string | null;
  /** Append a log line. Persisted back to AgentJob.logs. */
  log(level: AgentLogEntry["level"], message: string, data?: Record<string, unknown>): void;
  /** Emit a follow-up domain event. The workflow engine will route it. */
  emit(event: import("./events").DomainEvent): Promise<void>;
  /** Enforcement check — throws if the agent is not permitted. */
  assertCan(action: AllowedAction): void;
  /** The model client — stubbed in dev, real in prod. */
  model: ModelClient;
}

export interface Agent<I, O> {
  name: string;
  version: string;
  description: string;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
  allowedActions: AllowedAction[];
  requiresApproval: boolean;
  run(input: I, ctx: AgentContext): Promise<O>;
}

/** Minimal LLM interface. Providers implement this; agents are provider-agnostic. */
export interface ModelClient {
  complete(prompt: string, options?: { maxTokens?: number; temperature?: number }): Promise<string>;
}
