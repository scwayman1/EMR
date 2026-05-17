import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/log";

// EMR-154: Controlled Substance PDMP Auto-Biller
// Revenue cycle cron that scans the audit log for every time a provider queried 
// the state PDMP (Prescription Drug Monitoring Program). It automatically drops 
// the specific CPT code (e.g., 99454 or state-specific equivalent) to capture 
// revenue for the compliance review.

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const secret = process.env.CRON_SECRET ?? "";
    
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    logger.info({ event: "cron.pdmp_biller.started" });

    // 1. Fetch PDMP queries from the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const pdmpQueries = await prisma.auditLog.findMany({
      where: {
        action: "PDMP_DATABASE_QUERIED",
        createdAt: { gte: yesterday }
      },
      take: 100
    });

    let chargesCaptured = 0;

    for (const log of pdmpQueries) {
      // 2. Drop the charge into the associated Encounter's ledger
      // For this mock, we assume the audit log holds the encounterId in `details`
      const details = log.details as any;
      const encounterId = details?.encounterId;

      if (encounterId) {
        logger.info({ 
          event: "cron.pdmp_biller.charge_dropped", 
          encounterId 
        });

        // Add to billing queue
        await prisma.auditLog.create({
          data: {
            organizationId: log.organizationId,
            action: "BILLING_CHARGE_DROPPED",
            entity: "Encounter",
            entityId: encounterId,
            details: { cptCode: "99454", description: "PDMP Review", amountCents: 1500 } // $15.00 mock
          }
        });

        chargesCaptured++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      pdmpQueriesAnalyzed: pdmpQueries.length,
      chargesCaptured
    });

  } catch (error) {
    logger.error({ event: "cron.pdmp_biller.failed", error });
    return NextResponse.json({ error: "Failed to run PDMP auto-biller" }, { status: 500 });
  }
}
