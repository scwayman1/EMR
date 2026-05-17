import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/log";

// EMR-053: ProHub Integration
// Syncs users, products, and sales data from ProHub dispensaries to Leafjourney DB.

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const secret = process.env.PROHUB_SYNC_SECRET ?? "";
    
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const payload = await req.json();

    if (!payload.dispensaryId || !payload.syncType) {
      return NextResponse.json({ error: "Missing required fields: dispensaryId, syncType" }, { status: 400 });
    }

    let syncedItems = 0;

    // 1. Sync Products (Catalog)
    if (payload.syncType === "products" && Array.isArray(payload.data)) {
      for (const item of payload.data) {
        await prisma.cannabisProduct.upsert({
          where: {
            organizationId_sku: {
              organizationId: payload.dispensaryId,
              sku: item.sku
            }
          },
          update: {
            name: item.name,
            brand: item.brand,
            category: item.category,
            thcContent: item.thcContent,
            cbdContent: item.cbdContent,
            priceCents: item.priceCents,
            stockLevel: item.stockLevel,
          },
          create: {
            organizationId: payload.dispensaryId,
            sku: item.sku,
            name: item.name,
            brand: item.brand,
            category: item.category,
            thcContent: item.thcContent,
            cbdContent: item.cbdContent,
            priceCents: item.priceCents,
            stockLevel: item.stockLevel,
          }
        });
        syncedItems++;
      }
    }

    // 2. Sync Sales/Dispenses
    if (payload.syncType === "sales" && Array.isArray(payload.data)) {
      for (const sale of payload.data) {
        // Find existing patient if possible via phone/email matching 
        // to attach dispense record automatically
        let patientId = null;
        if (sale.patientPhone) {
          const match = await prisma.patient.findFirst({
            where: { organizationId: payload.dispensaryId, phone: sale.patientPhone }
          });
          if (match) patientId = match.id;
        }

        await prisma.dispensaryDispense.create({
          data: {
            organizationId: payload.dispensaryId,
            patientId: patientId,
            dispenseDate: new Date(sale.timestamp),
            rxId: sale.externalRxId,
            pharmacistUserId: "PROHUB_AUTO_SYNC",
            items: sale.items, // JSON array of products sold
          }
        });
        syncedItems++;
      }
    }

    logger.info({ event: "integrations.prohub.sync", syncType: payload.syncType, count: syncedItems });

    return NextResponse.json({ 
      success: true, 
      syncType: payload.syncType,
      itemsProcessed: syncedItems 
    });

  } catch (error) {
    logger.error({ event: "integrations.prohub.failed", error });
    return NextResponse.json({ error: "Failed to process ProHub sync" }, { status: 500 });
  }
}
