import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  patientId: z.string(),
  claimId: z.string().optional(),
  purpose: z.enum([
    "prior_auth",
    "medical_necessity",
    "appeal",
    "reimbursement",
  ]),
});

const output = z.object({
  patientId: z.string(),
  purpose: z.string(),
  evidenceCount: z.number(),
  packetSections: z.array(
    z.object({
      title: z.string(),
      itemCount: z.number(),
    }),
  ),
  downloadRef: z.string().nullable(),
});

/**
 * Insurance Evidence Bundler Agent
 * --------------------------------
 * Assembles patient-specific evidence for insurance submissions: outcome
 * trajectories, regimen history, provider documentation, COAs. Supports
 * prior-auth, medical-necessity, appeals, and reimbursement workflows.
 *
 * Status: stub (EMR-269 / Research fleet). Export format pending; returns
 * shape-only. Gated behind approval because this touches claims flow.
 */
export const insuranceEvidenceBundlerAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "insuranceEvidenceBundler",
  version: "0.1.0",
  description: "Assembles patient evidence packets for insurance submissions.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: true,

  async run({ patientId, purpose }, ctx) {
    ctx.log("info", "insuranceEvidenceBundler stub", { patientId, purpose });
    return {
      patientId,
      purpose,
      evidenceCount: 0,
      packetSections: [],
      downloadRef: null,
    };
  },
};
