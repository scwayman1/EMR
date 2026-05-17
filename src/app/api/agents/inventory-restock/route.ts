import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/log";

// EMR-052: Inventory Restock AI
// Background agent that monitors supply products and dispensary products.
// Automatically generates draft purchase orders for low-stock items.

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const secret = process.env.CRON_SECRET ?? "";
    
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Find all active products across all orgs that have fallen below their reorder point
    const lowStockProducts = await prisma.product.findMany({
      where: {
        active: true,
        trackInventory: true,
        // Since we don't have a specific reorderPoint field in Prisma Product model, 
        // we'll use a mocked logic or assume stockLevel <= 10 means low stock.
        stockLevel: { lte: 10 }
      },
      take: 500, // Batch limit
    });

    let draftOrdersCreated = 0;

    // Group low stock products by Organization
    const orgs = new Set(lowStockProducts.map(p => p.organizationId));

    for (const orgId of orgs) {
      const orgProducts = lowStockProducts.filter(p => p.organizationId === orgId);
      
      if (orgProducts.length > 0) {
        // Create a draft order for these products
        await prisma.order.create({
          data: {
            organizationId: orgId,
            status: "draft",
            totalCents: orgProducts.reduce((sum, p) => sum + (p.priceCents || 0), 0),
            items: orgProducts.map(p => ({
              productId: p.id,
              name: p.name,
              sku: p.sku,
              quantityToOrder: 20, // Auto-restock quantity
              unitPriceCents: p.priceCents
            })),
          }
        });
        draftOrdersCreated++;
      }
    }

    logger.info({ event: "agents.inventory_restock.completed", draftOrdersCreated, items: lowStockProducts.length });

    return NextResponse.json({ 
      success: true, 
      lowStockItemsIdentified: lowStockProducts.length,
      draftOrdersCreated
    });

  } catch (error) {
    logger.error({ event: "agents.inventory_restock.failed", error });
    return NextResponse.json({ error: "Failed to run inventory restock agent" }, { status: 500 });
  }
}
