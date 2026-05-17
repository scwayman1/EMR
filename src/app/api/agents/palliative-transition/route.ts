import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/log";

// EMR-152: Hospice/Palliative Transition AI
// NLP agent that scans the longitudinal patient record. It looks for triggers such as 
// frequent hospitalizations (ED bounce-backs), rapid unintended weight loss, and terminal 
// diagnoses (e.g., Stage IV metastatic disease). Automatically drops a "Palliative Care Consult" 
// suggestion into the provider's queue to improve end-of-life care quality.

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const secret = process.env.CRON_SECRET ?? "";
    
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    logger.info({ event: "agents.palliative_transition.started" });

    // 1. Fetch high-risk patient cohort (Mocked)
    const highRiskPatients = await prisma.patient.findMany({
      where: {
        // e.g., active diagnoses including 'metastatic', 'stage iv', 'end stage'
      },
      take: 20
    });

    let consultsSuggested = 0;

    for (const patient of highRiskPatients) {
      // 2. Evaluate Palliative Triggers
      // Mock Data: 
      const hospitalizationsLast6Months = 4;
      const weightLossPercentage = 15; // >10% is significant
      const terminalDiagnosis = true;

      if (hospitalizationsLast6Months >= 3 || (terminalDiagnosis && weightLossPercentage > 10)) {
        logger.warn({ 
          event: "agents.palliative_transition.criteria_met", 
          patientId: patient.id 
        });

        // 3. Draft Palliative Care Consult Order
        await prisma.auditLog.create({
          data: {
            organizationId: patient.organizationId,
            action: "PALLIATIVE_CARE_CONSULT_SUGGESTED",
            entity: "Patient",
            entityId: patient.id,
            details: { 
              triggers: ["Frequent ED Admissions", "Unintended Weight Loss >10%", "Terminal Diagnosis"],
              message: "Consider Palliative/Hospice Transition"
            }
          }
        });

        consultsSuggested++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      scanned: highRiskPatients.length,
      consultsSuggested
    });

  } catch (error) {
    logger.error({ event: "agents.palliative_transition.failed", error });
    return NextResponse.json({ error: "Failed to run palliative transition AI" }, { status: 500 });
  }
}
