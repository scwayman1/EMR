import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

const input = z.object({ patientId: z.string() });
const output = z.object({
  status: z.enum(["unknown", "pending", "qualified", "ineligible", "expired"]),
  rulesMatched: z.array(z.string()),
});

/**
 * Registry / Qualification Agent
 * ------------------------------
 * Evaluates diagnosis-linked eligibility rules for a patient. V1 is a
 * placeholder rules engine; the interface will hold once real rules are wired.
 */
export const registryAgent: Agent<z.infer<typeof input>, z.infer<typeof output>> = {
  name: "registry",
  version: "1.0.0",
  description: "Evaluates patient qualification status against program rules.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "write.qualification"],
  requiresApproval: false,

  async run({ patientId }, ctx) {
    ctx.assertCan("read.patient");
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new Error(`Patient not found: ${patientId}`);

    const rulesMatched: string[] = [];
    let status: z.infer<typeof output>["status"] = "unknown";

    if (patient.presentingConcerns && /chemo|oncology|cancer/i.test(patient.presentingConcerns)) {
      rulesMatched.push("oncology-program");
      status = "qualified";
    } else if (patient.intakeAnswers) {
      status = "pending";
    }

    ctx.assertCan("write.qualification");
    await prisma.patient.update({
      where: { id: patientId },
      data: { qualificationStatus: status },
    });

    await writeAgentAudit(
      "registry",
      "1.0.0",
      patient.organizationId,
      "registry.evaluated",
      { type: "Patient", id: patientId },
      { status, rulesMatched }
    );

    return { status, rulesMatched };
  },
};
