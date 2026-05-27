import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  organizationId: z.string(),
  staleHours: z.number().int().positive().max(720),
});

const output = z.object({
  candidates: z.array(
    z.object({
      cartId: z.string(),
      patientId: z.string(),
      itemCount: z.number(),
      ageHours: z.number(),
    }),
  ),
});

/**
 * Abandoned Cart Rescuer Agent
 * ----------------------------
 * Finds carts untouched for `staleHours` and surfaces them for a follow-up
 * nudge (message, email, in-app banner). Writes nothing — downstream
 * messaging agent drafts the outreach.
 *
 * Status: stub (EMR-17 / Agent-night). Query wired against the Cart model
 * shipped in EMR-231.
 */
export const abandonedCartRescuerAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "abandonedCartRescuer",
  version: "0.1.0",
  description: "Surfaces carts idle beyond the staleness threshold for follow-up.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ organizationId, staleHours }, ctx) {
    const { prisma } = await import("@/lib/db/prisma");
    const cutoff = new Date(Date.now() - staleHours * 3600 * 1000);
    const carts = await prisma.cart.findMany({
      where: {
        updatedAt: { lt: cutoff },
        patient: { organizationId },
        items: { some: {} },
      },
      select: {
        id: true,
        patientId: true,
        updatedAt: true,
        _count: { select: { items: true } },
      },
    });
    const now = Date.now();
    const candidates = carts.map((c) => ({
      cartId: c.id,
      patientId: c.patientId,
      itemCount: c._count.items,
      ageHours: Math.round((now - c.updatedAt.getTime()) / 3600000),
    }));
    ctx.log("info", "abandonedCartRescuer swept", { count: candidates.length });
    return { candidates };
  },
};
