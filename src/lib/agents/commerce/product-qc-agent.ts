import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({ productId: z.string() });

const output = z.object({
  productId: z.string(),
  issues: z.array(
    z.object({
      code: z.enum([
        "missing_coa",
        "stale_coa",
        "missing_cannabinoid_profile",
        "missing_dosage_guidance",
        "missing_images",
        "status_inconsistent",
      ]),
      severity: z.enum(["low", "medium", "high"]),
      message: z.string(),
    }),
  ),
  qualityScore: z.number().min(0).max(100),
});

/**
 * Product QC Agent
 * ----------------
 * Audits marketplace `Product` rows for catalog hygiene: missing COA,
 * stale lab results, missing cannabinoid disclosure, missing dosage
 * guidance, status inconsistencies (inStock + status=archived etc).
 *
 * Status: stub (EMR-17 / Agent-night). Emits basic checks today so the
 * catalog QC surface can start rendering real issues.
 */
export const productQCAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "productQC",
  version: "0.1.0",
  description: "Audits product catalog rows for missing or stale metadata.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ productId }, ctx) {
    const { prisma } = await import("@/lib/db/prisma");
    const p = await prisma.product.findUnique({ where: { id: productId } });
    if (!p) return { productId, issues: [], qualityScore: 0 };

    const issues: z.infer<typeof output>["issues"] = [];
    if (!p.coaUrl) issues.push({ code: "missing_coa", severity: "high", message: "No COA URL on record." });
    if (p.thcContent == null && p.cbdContent == null)
      issues.push({ code: "missing_cannabinoid_profile", severity: "medium", message: "No THC/CBD content disclosed." });
    if (!p.dosageGuidance)
      issues.push({ code: "missing_dosage_guidance", severity: "medium", message: "No dosage guidance for patients." });
    if (p.images.length === 0 && !p.imageUrl)
      issues.push({ code: "missing_images", severity: "low", message: "No product images uploaded." });

    const qualityScore = Math.max(0, 100 - issues.reduce((s, i) => s + (i.severity === "high" ? 40 : i.severity === "medium" ? 20 : 10), 0));
    ctx.log("info", "productQC scanned", { productId, issueCount: issues.length, qualityScore });
    return { productId, issues, qualityScore };
  },
};
