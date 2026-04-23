import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  organizationId: z.string(),
  productId: z.string(),
  cohortPatientIds: z.array(z.string()),
  bundleType: z.enum(["rwe_summary", "safety_profile", "efficacy_dossier"]),
});

const output = z.object({
  productId: z.string(),
  bundleType: z.string(),
  citations: z.array(z.string()),
  downloadUrl: z.string().nullable(),
  generatedAt: z.string(),
  notes: z.string(),
});

/**
 * RWE (Real-World Evidence) Bundler Agent
 * ---------------------------------------
 * Packages cohort outcomes + regimen histories into a pharma-facing
 * real-world-evidence dossier. Output references structured artifacts
 * that the export pipeline will render.
 *
 * Status: stub (EMR-269 / Research fleet). Returns metadata-only until
 * the export pipeline exists; `downloadUrl` stays null. No PHI leaves
 * this function — de-identification runs in `deidentifier` first.
 */
export const rweBundlerAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "rweBundler",
  version: "0.1.0",
  description: "Packages cohort outcomes into a pharma real-world-evidence bundle.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: true,

  async run({ productId, bundleType }, ctx) {
    ctx.log("info", "rweBundler stub", { productId, bundleType });
    return {
      productId,
      bundleType,
      citations: [],
      downloadUrl: null,
      generatedAt: new Date().toISOString(),
      notes: "Stub — export pipeline pending. Will reject if cohort contains fewer than N patients once implemented.",
    };
  },
};
