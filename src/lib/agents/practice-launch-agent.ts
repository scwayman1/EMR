import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

const input = z.object({ organizationId: z.string() });
const output = z.object({
  readinessScore: z.number(),
  blockers: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

const CHECKLIST = [
  { key: "hasOwner", label: "Practice owner account created" },
  { key: "hasClinician", label: "At least one clinician added" },
  { key: "hasOperator", label: "Intake operator added" },
  { key: "hasPatient", label: "First patient in the system" },
];

/**
 * Practice Launch Agent
 * ---------------------
 * Evaluates go-live readiness for a new practice by walking a checklist
 * and summarizing what's left. Writes to PracticeLaunchStatus.
 */
export const practiceLaunchAgent: Agent<z.infer<typeof input>, z.infer<typeof output>> = {
  name: "practiceLaunch",
  version: "1.0.0",
  description: "Tracks practice go-live readiness and flags blockers.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["write.launchStatus"],
  requiresApproval: false,

  async run({ organizationId }, ctx) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        memberships: true,
        patients: { take: 1 },
      },
    });
    if (!org) throw new Error(`Organization not found: ${organizationId}`);

    const roles = new Set(org.memberships.map((m) => m.role));
    const state: Record<string, boolean> = {
      hasOwner: roles.has("practice_owner"),
      hasClinician: roles.has("clinician"),
      hasOperator: roles.has("operator"),
      hasPatient: org.patients.length > 0,
    };

    const blockers = CHECKLIST.filter((c) => !state[c.key]).map((c) => c.label);
    const nextSteps = blockers.length > 0 ? blockers.slice(0, 3) : ["Schedule go-live call"];
    const readinessScore = Math.round(
      ((CHECKLIST.length - blockers.length) / CHECKLIST.length) * 100
    );

    ctx.assertCan("write.launchStatus");
    await prisma.practiceLaunchStatus.upsert({
      where: { organizationId },
      update: { readinessScore, blockers: blockers as any, nextSteps: nextSteps as any },
      create: {
        organizationId,
        readinessScore,
        blockers: blockers as any,
        nextSteps: nextSteps as any,
      },
    });

    await writeAgentAudit(
      "practiceLaunch",
      "1.0.0",
      organizationId,
      "practice.readiness.evaluated",
      { type: "Organization", id: organizationId },
      { readinessScore }
    );

    return { readinessScore, blockers, nextSteps };
  },
};
