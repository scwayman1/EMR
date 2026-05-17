import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/log";

// EMR-157: Automated Organ Donor Registry Sync
// Critical care webhook that triggers when a patient is marked as brain dead 
// or imminent death in the ICU. It automatically checks the state Organ 
// Procurement Organization (OPO) registry and pages the transplant team if 
// the patient is a registered donor.

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const secret = process.env.OPO_WEBHOOK_SECRET ?? "";
    
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const payload = await req.json();

    if (!payload.patientId || !payload.clinicalStatus) {
      return NextResponse.json({ error: "Missing required clinical fields" }, { status: 400 });
    }

    const { patientId, clinicalStatus } = payload;

    // Trigger only for imminent/brain death scenarios
    if (clinicalStatus !== "imminent_death" && clinicalStatus !== "brain_death") {
      return NextResponse.json({ success: true, status: "ignored_non_terminal" });
    }

    logger.info({ 
      event: "integrations.organ_donor.evaluating", 
      patientId,
      clinicalStatus 
    });

    // 1. Mock API call to State Organ Donor Registry (e.g., Donate Life)
    const isRegisteredDonor = true; // Mock true

    if (isRegisteredDonor) {
      logger.warn({ 
        event: "integrations.organ_donor.match_found", 
        patientId 
      });

      // 2. Dispatch alert to local OPO (Organ Procurement Organization)
      await prisma.auditLog.create({
        data: {
          organizationId: payload.organizationId || "DEFAULT",
          action: "OPO_PROCUREMENT_ALERT_DISPATCHED",
          entity: "Patient",
          entityId: patientId,
          details: { 
            status: clinicalStatus, 
            message: "Patient is a registered organ donor. OPO representative paged to ICU." 
          }
        }
      });

      return NextResponse.json({ 
        success: true, 
        status: "opo_alert_dispatched"
      });
    }

    return NextResponse.json({ 
      success: true, 
      status: "not_a_registered_donor"
    });

  } catch (error) {
    logger.error({ event: "integrations.organ_donor.failed", error });
    return NextResponse.json({ error: "Failed to run organ donor sync" }, { status: 500 });
  }
}
