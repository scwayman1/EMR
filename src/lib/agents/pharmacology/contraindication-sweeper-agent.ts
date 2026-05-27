import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  patientId: z.string(),
});

const output = z.object({
  patientId: z.string(),
  contraindications: z.array(z.string()),
  riskyProducts: z.array(
    z.object({
      productId: z.string(),
      reasons: z.array(z.string()),
    }),
  ),
  swept: z.boolean(),
});

/**
 * Contraindication Sweeper
 * ------------------------
 * Status: stub (EMR-272). Will cross-reference `Patient.contraindications`
 * + `allergies` against the marketplace catalog to flag risky listings.
 * Returns an empty risky list today but echoes the patient's known
 * contraindications so callers can render context.
 */
export const contraindicationSweeperAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "contraindicationSweeper",
  version: "0.1.0",
  description:
    "Sweeps the catalog for products that conflict with a patient's contraindications.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ patientId }, ctx) {
    const { prisma } = await import("@/lib/db/prisma");
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { contraindications: true },
    });
    ctx.log("info", "contraindicationSweeper stub", { patientId });
    return {
      patientId,
      contraindications: patient?.contraindications ?? [],
      riskyProducts: [],
      swept: Boolean(patient),
    };
  },
};
