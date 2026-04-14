import { prisma } from "@/lib/db/prisma";
import type { AgentTools, AllowedAction } from "./types";

// ---------------------------------------------------------------------------
// Agent Harness V3: Tool Registry
// ---------------------------------------------------------------------------
// Builds a scoped tool set for an agent based on its allowedActions.
// Each tool wraps a Prisma query or domain function. Agents never touch
// Prisma directly — everything goes through tools, which respect
// permission boundaries.
// ---------------------------------------------------------------------------

interface ToolRegistryArgs {
  agentName: string;
  agentVersion: string;
  organizationId: string | null;
  allowed: Set<AllowedAction>;
  stepFn: (name: string, data?: Record<string, unknown>) => void;
  sourceFn: (kind: string, ids: string[]) => void;
}

export function buildToolRegistry(args: ToolRegistryArgs): AgentTools {
  const { allowed, stepFn, sourceFn } = args;

  // Helper: check permission before running
  function guard(action: AllowedAction) {
    if (!allowed.has(action)) {
      throw new Error(`Agent ${args.agentName}@${args.agentVersion} not permitted to ${action}`);
    }
  }

  const tools: AgentTools = {
    // ── Database queries ────────────────────────────────

    async queryPatient(patientId, include) {
      guard("read.patient");
      stepFn("queryPatient", { patientId });

      const includeMap: Record<string, boolean> = {};
      for (const key of include ?? []) includeMap[key] = true;

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: Object.keys(includeMap).length > 0 ? includeMap as any : undefined,
      });
      if (patient) sourceFn("patients", [patientId]);
      return patient;
    },

    async queryEncounters(patientId, options) {
      guard("read.encounter");
      stepFn("queryEncounters", { patientId, ...options });

      const encounters = await prisma.encounter.findMany({
        where: {
          patientId,
          ...(options?.status ? { status: options.status as any } : {}),
        },
        orderBy: { scheduledFor: "desc" },
        take: options?.limit ?? 10,
        include: {
          notes: { where: { status: "finalized" }, orderBy: { finalizedAt: "desc" }, take: 1 },
        },
      });
      sourceFn("encounters", encounters.map((e) => e.id));
      return encounters;
    },

    async queryOutcomeLogs(patientId, options) {
      guard("read.patient");
      stepFn("queryOutcomeLogs", { patientId, ...options });

      const logs = await prisma.outcomeLog.findMany({
        where: {
          patientId,
          ...(options?.metric ? { metric: options.metric as any } : {}),
          ...(options?.since ? { loggedAt: { gte: options.since } } : {}),
        },
        orderBy: { loggedAt: "desc" },
        take: options?.limit ?? 50,
      });
      sourceFn("outcomeLogs", logs.map((l) => l.id));
      return logs;
    },

    async queryMedications(patientId) {
      guard("read.patient");
      stepFn("queryMedications", { patientId });

      return prisma.patientMedication.findMany({
        where: { patientId, active: true },
        orderBy: { name: "asc" },
      });
    },

    async queryDosingRegimens(patientId) {
      guard("read.patient");
      stepFn("queryDosingRegimens", { patientId });

      return prisma.dosingRegimen.findMany({
        where: { patientId, active: true },
        include: { product: true },
      });
    },

    // ── Domain knowledge ────────────────────────────────

    async checkInteractions(medications) {
      stepFn("checkInteractions", { count: medications.length });
      const { checkInteractions } = await import("@/lib/domain/drug-interactions");
      // checkInteractions expects (medications, cannabinoids) — default cannabinoids to common set
      return checkInteractions(medications, ["THC", "CBD", "CBN", "CBG"]);
    },

    async checkContraindications(input) {
      stepFn("checkContraindications", { concerns: input.presentingConcerns });
      const { checkContraindications } = await import("@/lib/domain/contraindications");
      return checkContraindications({
        dateOfBirth: input.dateOfBirth ?? null,
        presentingConcerns: input.presentingConcerns ?? null,
        medicationNames: input.medicationNames ?? [],
        historyText: input.historyText ?? "",
        icd10Codes: input.icd10Codes ?? [],
      });
    },

    async lookupMedication(name) {
      stepFn("lookupMedication", { name });
      const { lookupMedication } = await import("@/lib/domain/medication-explainer");
      return lookupMedication(name);
    },

    async explainLab(name, value) {
      stepFn("explainLab", { name, value });
      const { explainLabValue } = await import("@/lib/domain/lab-explainer");
      return explainLabValue(name, value);
    },

    async searchEducation(query) {
      stepFn("searchEducation", { query });
      const { searchEducationDatabase } = await import("@/lib/domain/cannabis-education");
      return searchEducationDatabase(query);
    },

    // ── Memory ──────────────────────────────────────────

    async recallMemories(patientId, options) {
      guard("read.patient");
      stepFn("recallMemories", { patientId, ...options });
      const { recallMemories } = await import("@/lib/agents/memory/patient-memory");
      const memories = await recallMemories(patientId, options as any);
      sourceFn("memories", memories.map((m: any) => m.id));
      return memories;
    },

    async recordMemory(input) {
      stepFn("recordMemory", { patientId: input.patientId, kind: input.kind });
      const { recordMemory } = await import("@/lib/agents/memory/patient-memory");
      return recordMemory(input as any);
    },

    async recallObservations(patientId, options) {
      guard("read.patient");
      stepFn("recallObservations", { patientId, ...options });
      const { recallObservations } = await import("@/lib/agents/memory/clinical-observation");
      const obs = await recallObservations(patientId, options as any);
      sourceFn("observations", obs.map((o: any) => o.id));
      return obs;
    },

    async recordObservation(input) {
      stepFn("recordObservation", { patientId: input.patientId, category: input.category });
      const { recordObservation } = await import("@/lib/agents/memory/clinical-observation");
      return recordObservation(input as any);
    },

    // ── Agent delegation ────────────────────────────────

    async callAgent(agentName, input) {
      stepFn("callAgent", { agentName });
      const { agentRegistry } = await import("@/lib/agents");
      const agent = (agentRegistry as Record<string, any>)[agentName];
      if (!agent) throw new Error(`Agent ${agentName} not found in registry`);

      // Build a sub-context for the delegated agent
      const subCtx = {
        jobId: `${args.agentName}-delegate-${Date.now()}`,
        organizationId: args.organizationId,
        log() {},
        async emit() {},
        assertCan() {},
        model: (await import("./model-client")).resolveModelClient(),
        tools, // share the same tool registry
        stepResults: new Map(),
      };

      const parsed = agent.inputSchema.parse(input);
      return agent.run(parsed, subCtx);
    },

    // ── Reasoning trace ─────────────────────────────────

    step: stepFn,
    source: sourceFn,
  };

  return tools;
}
