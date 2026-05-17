import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/log";

// EMR-151: Radiology AI Over-Read Router
// Webhook that triggers when a new DICOM image (e.g., Head CT, Chest X-Ray) is stored 
// in the PACS system. It automatically routes the study to an external AI service 
// (like Aidoc or Viz.ai) for a rapid secondary read. If the AI detects an emergency 
// (e.g., intracranial hemorrhage, large vessel occlusion), it interrupts the radiologist immediately.

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const secret = process.env.RADIOLOGY_WEBHOOK_SECRET ?? "";
    
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const payload = await req.json();

    if (!payload.studyId || !payload.modality || !payload.patientId) {
      return NextResponse.json({ error: "Missing required PACS fields" }, { status: 400 });
    }

    const { studyId, modality, patientId } = payload;

    logger.info({ 
      event: "integrations.radiology_ai.routing", 
      patientId, 
      studyId,
      modality
    });

    // 1. Mock Transmission to external AI Server (e.g., Viz.ai)
    const aiServiceAvailable = true;
    
    // 2. Mock AI finding an acute emergency
    const aiFoundEmergency = (modality === "CT_HEAD"); // Mock logic
    
    if (aiServiceAvailable && aiFoundEmergency) {
      logger.warn({ 
        event: "integrations.radiology_ai.critical_finding", 
        studyId, 
        finding: "Suspected Intracranial Hemorrhage" 
      });

      // 3. Immediately interrupt Radiologist / ED Provider
      await prisma.auditLog.create({
        data: {
          organizationId: payload.organizationId || "DEFAULT",
          action: "RADIOLOGY_AI_CRITICAL_ALERT",
          entity: "Patient",
          entityId: patientId,
          details: { 
            studyId, 
            modality, 
            aiImpression: "Suspected Intracranial Hemorrhage. Read study STAT." 
          }
        }
      });

      return NextResponse.json({ 
        success: true, 
        status: "critical_alert_generated",
        finding: "Suspected Intracranial Hemorrhage"
      });
    }

    return NextResponse.json({ 
      success: true, 
      status: "routed_no_acute_findings"
    });

  } catch (error) {
    logger.error({ event: "integrations.radiology_ai.failed", error });
    return NextResponse.json({ error: "Failed to route to radiology AI" }, { status: 500 });
  }
}
