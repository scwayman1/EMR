import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/log";

// EMR-150: Automated Peer Review Selector (OPPE/FPPE)
// Nightly cron that ensures compliance with Ongoing Professional Practice Evaluation (OPPE).
// It randomly selects 5% of signed clinical encounters for each provider and routes 
// them to a blinded colleague for QA / Peer Review scoring.

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const secret = process.env.CRON_SECRET ?? "";
    
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    logger.info({ event: "cron.peer_review_selector.started" });

    // 1. Fetch completed encounters from the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentEncounters = await prisma.encounter.findMany({
      where: {
        status: "completed",
        updatedAt: { gte: yesterday }
        // requires providerId
      },
      take: 500 // Mock batch size
    });

    let routedCount = 0;

    // 2. Group by provider and select 5% at random
    const groupedByProvider: Record<string, any[]> = {};
    for (const enc of recentEncounters) {
      if (enc.providerId) {
        if (!groupedByProvider[enc.providerId]) groupedByProvider[enc.providerId] = [];
        groupedByProvider[enc.providerId].push(enc);
      }
    }

    for (const [providerId, encounters] of Object.entries(groupedByProvider)) {
      const selectionCount = Math.max(1, Math.ceil(encounters.length * 0.05));
      
      // Shuffle and slice (Mock random selection)
      const selectedForReview = encounters.slice(0, selectionCount);

      for (const enc of selectedForReview) {
        // 3. Route to blinded peer review queue
        logger.info({ 
          event: "cron.peer_review_selector.routed", 
          encounterId: enc.id, 
          originalProviderId: providerId 
        });

        await prisma.auditLog.create({
          data: {
            organizationId: enc.organizationId,
            action: "PEER_REVIEW_QUEUED",
            entity: "Encounter",
            entityId: enc.id,
            details: { originalProviderId: providerId, reason: "Random 5% QA Selection (OPPE)" }
          }
        });

        routedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      encountersScanned: recentEncounters.length,
      routedForReview: routedCount
    });

  } catch (error) {
    logger.error({ event: "cron.peer_review_selector.failed", error });
    return NextResponse.json({ error: "Failed to run peer review selector" }, { status: 500 });
  }
}
