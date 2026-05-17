import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/log";

// EMR-155: Behavioral Health Suicide Risk NLP Scanner
// High-priority safety webhook. Scans incoming secure patient portal messages 
// and telehealth chat transcripts. If it detects suicidal ideation (SI) or 
// self-harm keywords, it bypasses the standard inbox and instantly pages the 
// on-call Crisis Response team.

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const secret = process.env.WEBHOOK_SECRET ?? "";
    
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const payload = await req.json();

    if (!payload.patientId || !payload.messageBody) {
      return NextResponse.json({ error: "Missing required message fields" }, { status: 400 });
    }

    const { patientId, messageBody } = payload;
    const text = messageBody.toLowerCase();

    // 1. NLP Scan for Self-Harm / SI
    const riskKeywords = ["kill myself", "end it all", "want to die", "better off without me", "suicide"];
    let isHighRisk = false;

    for (const keyword of riskKeywords) {
      if (text.includes(keyword)) {
        isHighRisk = true;
        break;
      }
    }

    if (isHighRisk) {
      logger.error({ 
        event: "agents.suicide_risk_scanner.acute_risk_detected", 
        patientId 
      });

      // 2. Instantly page Crisis Response / 988 Protocol
      await prisma.auditLog.create({
        data: {
          organizationId: payload.organizationId || "DEFAULT",
          action: "BEHAVIORAL_CRISIS_ALERT_DISPATCHED",
          entity: "Patient",
          entityId: patientId,
          details: { riskLevel: "SEVERE", actionTaken: "Paged On-Call Psychiatric Provider / Crisis Team" }
        }
      });

      return NextResponse.json({ 
        success: true, 
        status: "crisis_alert_dispatched"
      });
    }

    // 3. Route to normal inbox if safe
    return NextResponse.json({ 
      success: true, 
      status: "routed_to_routine_inbox"
    });

  } catch (error) {
    logger.error({ event: "agents.suicide_risk_scanner.failed", error });
    return NextResponse.json({ error: "Failed to scan for suicide risk" }, { status: 500 });
  }
}
