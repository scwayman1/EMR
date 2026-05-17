import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/log";

// EMR-156: Provider "Moonlighting" Compliance Tracker
// Security/HR cron that scans external Health Information Exchange (HIE) data. 
// It looks for prescriptions or claims written by the clinic's full-time contracted 
// providers but billed under a competing organization's NPI, flagging potential 
// unauthorized moonlighting violations.

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const secret = process.env.CRON_SECRET ?? "";
    
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    logger.info({ event: "cron.moonlighting_tracker.started" });

    // 1. Fetch internal provider NPIs
    // Mocking finding contracted providers
    const internalNPIs = ["1234567890", "0987654321"];
    const ourFacilityNPI = "FACILITY-999";

    // 2. Query external HIE/Clearinghouse for recent activity (Mock Data)
    const externalHieClaims = [
      { providerNPI: "1234567890", billingFacilityNPI: "FACILITY-999", date: "2026-05-15" }, // Normal
      { providerNPI: "0987654321", billingFacilityNPI: "COMPETITOR-URGENT-CARE", date: "2026-05-16" } // Violation!
    ];

    let violationsFlagged = 0;

    for (const claim of externalHieClaims) {
      if (internalNPIs.includes(claim.providerNPI) && claim.billingFacilityNPI !== ourFacilityNPI) {
        
        // 3. Flag HR / Compliance Officer
        logger.warn({ 
          event: "cron.moonlighting_tracker.violation_detected", 
          providerNPI: claim.providerNPI,
          competingFacility: claim.billingFacilityNPI 
        });

        await prisma.auditLog.create({
          data: {
            organizationId: "DEFAULT",
            action: "PROVIDER_MOONLIGHTING_VIOLATION",
            entity: "Provider", // Needs mapping from NPI
            entityId: claim.providerNPI,
            details: { competingFacility: claim.billingFacilityNPI, dateOfService: claim.date }
          }
        });

        violationsFlagged++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      externalClaimsScanned: externalHieClaims.length,
      violationsFlagged
    });

  } catch (error) {
    logger.error({ event: "cron.moonlighting_tracker.failed", error });
    return NextResponse.json({ error: "Failed to run moonlighting tracker" }, { status: 500 });
  }
}
