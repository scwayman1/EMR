import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

const input = z.object({ documentId: z.string() });
const output = z.object({
  classification: z.enum(["note", "lab", "image", "diagnosis", "letter", "other"]),
  tags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

const HEURISTICS: Array<{ pattern: RegExp; kind: z.infer<typeof output>["classification"] }> = [
  { pattern: /\.(png|jpg|jpeg|heic|webp)$/i, kind: "image" },
  { pattern: /(cbc|panel|lab|result)/i, kind: "lab" },
  { pattern: /(dx|diagnos)/i, kind: "diagnosis" },
  { pattern: /(letter|referral)/i, kind: "letter" },
  { pattern: /(note|summary|report)/i, kind: "note" },
];

/**
 * Document Organizer Agent
 * ------------------------
 * Classifies newly uploaded documents into the canonical taxonomy and suggests
 * tags. Low risk: classification is reversible and audit-only.
 */
export const documentOrganizerAgent: Agent<z.infer<typeof input>, z.infer<typeof output>> = {
  name: "documentOrganizer",
  version: "1.0.0",
  description: "Classifies uploaded documents and assigns tags.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.document", "write.document.metadata"],
  requiresApproval: false,

  async run({ documentId }, ctx) {
    ctx.assertCan("read.document");
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error(`Document not found: ${documentId}`);

    const haystack = `${doc.originalName} ${doc.mimeType}`;
    let classification: z.infer<typeof output>["classification"] = "other";
    for (const h of HEURISTICS) {
      if (h.pattern.test(haystack)) {
        classification = h.kind;
        break;
      }
    }

    const tags: string[] = [];
    if (doc.mimeType.startsWith("image/")) tags.push("image");
    if (/chemo|oncology/i.test(doc.originalName)) tags.push("oncology");
    if (/sleep/i.test(doc.originalName)) tags.push("sleep");

    ctx.assertCan("write.document.metadata");
    await prisma.document.update({
      where: { id: documentId },
      data: {
        kind: classification,
        aiClassified: true,
        aiTags: tags,
        aiConfidence: 0.6,
        needsReview: classification === "other",
      },
    });

    await writeAgentAudit(
      "documentOrganizer",
      "1.0.0",
      doc.organizationId,
      "document.classified",
      { type: "Document", id: documentId },
      { classification, tags }
    );

    ctx.log("info", "Document classified", { classification, tags });
    return { classification, tags, confidence: 0.6 };
  },
};
