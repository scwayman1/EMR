import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({ productId: z.string() });

const output = z.object({
  productId: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  imageAltTexts: z.array(z.string()),
});

/**
 * SEO Metadata Agent
 * ------------------
 * Generates meta-title, meta-description, and image alt-text per product.
 * Output is pasted into the Product record (future field) or returned for
 * SSR head tags.
 *
 * Status: stub (EMR-17 / Agent-night). Emits deterministic defaults from
 * product fields; LLM-generated copy is TODO.
 */
export const seoMetadataAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "seoMetadata",
  version: "0.1.0",
  description: "Generates SEO meta-title, description, and alt text per product.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ productId }, ctx) {
    const { prisma } = await import("@/lib/db/prisma");
    const p = await prisma.product.findUnique({ where: { id: productId } });
    if (!p) return { productId, metaTitle: "", metaDescription: "", imageAltTexts: [] };

    const metaTitle = `${p.name} — ${p.brand} | Leafjourney`;
    const metaDescription = p.shortDescription ?? p.description.slice(0, 155);
    const imageAltTexts = p.images.length
      ? p.images.map(() => `${p.name} by ${p.brand}`)
      : [`${p.name} by ${p.brand}`];

    ctx.log("info", "seoMetadata generated defaults", { productId });
    return { productId, metaTitle, metaDescription, imageAltTexts };
  },
};
