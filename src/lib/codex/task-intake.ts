import { z } from "zod";

export const codexTaskKindSchema = z.enum(["ask", "code", "automate", "review"]);
export type CodexTaskKind = z.infer<typeof codexTaskKindSchema>;

export const executionSurfaceSchema = z.enum(["local", "cloud", "automation"]);
export type ExecutionSurface = z.infer<typeof executionSurfaceSchema>;

export const codexTaskInputSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().min(10),
  kind: codexTaskKindSchema,
  requiresRepositoryWrite: z.boolean().default(false),
  requiresInternet: z.boolean().default(false),
  longRunning: z.boolean().default(false),
  estimatedChangedFiles: z.number().int().nonnegative().default(0),
  triggerType: z.enum(["manual", "schedule", "event"]).default("manual"),
  allowBackgroundRun: z.boolean().default(false),
  requestedSurface: executionSurfaceSchema.optional(),
});

export type CodexTaskInput = z.infer<typeof codexTaskInputSchema>;

export type ApprovalRequirement = "none" | "before_write" | "before_execute" | "before_merge";

export type CodexExecutionPlan = {
  surface: ExecutionSurface;
  confidence: number;
  reasoning: string[];
  approval: ApprovalRequirement;
  requiresIsolation: boolean;
  suggestedParallelism: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function scoreComplexity(input: CodexTaskInput): number {
  const fileWeight = Math.min(input.estimatedChangedFiles, 20) / 20;
  const longRunWeight = input.longRunning ? 0.25 : 0;
  const writeWeight = input.requiresRepositoryWrite ? 0.2 : 0;
  const netWeight = input.requiresInternet ? 0.1 : 0;
  return clamp01(fileWeight * 0.45 + longRunWeight + writeWeight + netWeight);
}

export function buildExecutionPlan(rawInput: CodexTaskInput): CodexExecutionPlan {
  const input = codexTaskInputSchema.parse(rawInput);
  const reasoning: string[] = [];

  if (input.triggerType !== "manual") {
    reasoning.push("Non-manual trigger detected, favoring automation surface.");
  }

  if (input.requestedSurface) {
    reasoning.push(`User requested ${input.requestedSurface} execution surface.`);
  }

  const complexity = scoreComplexity(input);
  const requiresIsolation = input.longRunning || input.estimatedChangedFiles >= 6 || input.kind === "automate";

  let surface: ExecutionSurface = "local";

  if (input.triggerType !== "manual" || input.kind === "automate" || input.allowBackgroundRun) {
    surface = "automation";
    reasoning.push("Task is recurring/triggered or allows background run, so automation is preferred.");
  } else if (input.kind === "ask" && !input.requiresRepositoryWrite) {
    surface = "local";
    reasoning.push("Q&A task with no writes is best handled in a local paired flow.");
  } else if (complexity >= 0.45 || input.longRunning) {
    surface = "cloud";
    reasoning.push("Task complexity suggests isolated delegated execution in cloud sandbox.");
  }

  if (input.requestedSurface) {
    if (input.requestedSurface === "automation" && input.triggerType === "manual" && !input.allowBackgroundRun) {
      reasoning.push("Requested automation was downgraded because task is manual without background permission.");
    } else {
      surface = input.requestedSurface;
      reasoning.push("Requested surface accepted.");
    }
  }

  let approval: ApprovalRequirement = "none";
  if (input.requiresRepositoryWrite && surface === "local") approval = "before_write";
  if (surface === "cloud") approval = "before_execute";
  if (surface === "automation" && input.requiresRepositoryWrite) approval = "before_merge";

  const suggestedParallelism =
    surface === "automation"
      ? Math.max(1, Math.min(6, Math.ceil((input.estimatedChangedFiles || 1) / 3)))
      : surface === "cloud"
        ? Math.max(1, Math.min(4, Math.ceil((input.estimatedChangedFiles || 1) / 4)))
        : 1;

  const confidence = clamp01(0.55 + (input.requestedSurface ? 0.2 : 0) + (complexity < 0.5 ? 0.1 : -0.05));

  return {
    surface,
    confidence,
    reasoning,
    approval,
    requiresIsolation,
    suggestedParallelism,
  };
}
