import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// Inventory Alert Agent (demo)
// ---------------------------------------------------------------------------
// We don't have a real inventory model yet, so this agent produces a
// deterministic set of mock low-stock / out-of-stock alerts and creates a
// Task per alert for the operator. The shape of the output is stable so
// the UI can be built against it and swapped to real data later.
// ---------------------------------------------------------------------------

const input = z.object({ organizationId: z.string() });

const output = z.object({
  lowStockCount: z.number(),
  outOfStockCount: z.number(),
  alertsSent: z.number(),
});

// Mock alerts — deterministic but representative.
const MOCK_INVENTORY = [
  { product: "CBD:THC 1:1 Tincture, 30mL", units: 4, threshold: 10 },
  { product: "Indica Gummies 5mg, 30ct", units: 0, threshold: 6 },
  { product: "Daytime Sativa Tincture 30mL", units: 2, threshold: 8 },
  { product: "Topical Balm 2oz", units: 12, threshold: 10 }, // healthy
  { product: "CBD Isolate Softgels 25mg, 60ct", units: 0, threshold: 4 },
];

export const inventoryAlertAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "inventoryAlert",
  version: "1.0.0",
  description:
    "Demo agent that produces mock low-stock and out-of-stock alerts for " +
    "the operator and creates tasks for each.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["write.task"],
  requiresApproval: false,

  async run({ organizationId }, ctx) {
    const lowStock = MOCK_INVENTORY.filter(
      (i) => i.units > 0 && i.units < i.threshold
    );
    const outOfStock = MOCK_INVENTORY.filter((i) => i.units === 0);

    ctx.assertCan("write.task");

    let alertsSent = 0;
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    for (const item of [...outOfStock, ...lowStock]) {
      const existing = await prisma.task.findFirst({
        where: {
          organizationId,
          createdAt: { gte: threeDaysAgo },
          title: { contains: "Inventory" },
          description: { contains: item.product },
        },
      });
      if (existing) continue;

      const isOut = item.units === 0;
      await prisma.task.create({
        data: {
          organizationId,
          title: isOut
            ? `Inventory: OUT of ${item.product}`
            : `Inventory: low stock for ${item.product}`,
          description: isOut
            ? `${item.product} is out of stock. Reorder immediately to avoid patient gaps.\n\n[demo inventory alert]`
            : `${item.product} is running low (${item.units} units, threshold ${item.threshold}). Consider reordering.\n\n[demo inventory alert]`,
          status: "open",
          assigneeRole: "operator",
          dueAt: new Date(
            Date.now() + (isOut ? 1 : 3) * 24 * 60 * 60 * 1000
          ),
        },
      });
      alertsSent += 1;
    }

    await writeAgentAudit(
      "inventoryAlert",
      "1.0.0",
      organizationId,
      "inventory.alerts.created",
      { type: "Organization", id: organizationId },
      {
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        alertsSent,
      }
    );

    ctx.log("info", "Inventory alerts processed", {
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      alertsSent,
    });

    return {
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      alertsSent,
    };
  },
};
