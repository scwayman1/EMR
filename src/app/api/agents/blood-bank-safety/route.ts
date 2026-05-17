import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/log";

// EMR-149: Blood Bank / Transfusion Safety Check
// High-stakes clinical webhook. Intercepts orders for blood products (e.g., PRBCs, Plasma). 
// Cross-references the order against the patient's historical Type and Screen, 
// crossmatch results, and antibody history to prevent catastrophic ABO incompatibility.

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const secret = process.env.WEBHOOK_SECRET ?? "";
    
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const payload = await req.json();

    if (!payload.patientId || !payload.productOrdered || !payload.providerId) {
      return NextResponse.json({ error: "Missing required blood bank fields" }, { status: 400 });
    }

    const { patientId, productOrdered, providerId } = payload;

    // 1. Fetch Patient Blood Type History
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      // Mocking: include: { labResults: true, alerts: true }
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // 2. Perform Safety Check (Mock Logic)
    // Assume patient is O-Negative and has anti-Kell antibodies
    const patientBloodType = "O-Negative";
    const hasAntibodies = true;
    
    // Simulate checking the selected unit in the blood bank inventory
    const unitBloodType = "A-Positive"; // Incompatible!

    let isSafe = true;
    let blockReason = "";

    if (patientBloodType === "O-Negative" && unitBloodType !== "O-Negative") {
      isSafe = false;
      blockReason = "ABO Incompatibility: Patient is O-Negative, ordered unit is A-Positive.";
    } else if (hasAntibodies) {
      isSafe = false;
      blockReason = "Patient has historical antibodies (Anti-Kell). Requires specialized crossmatch.";
    }

    // 3. Enforce Hard Stop
    if (!isSafe) {
      logger.error({ 
        event: "agents.blood_bank_safety.incompatible_order_blocked", 
        patientId, 
        providerId,
        reason: blockReason 
      });

      await prisma.auditLog.create({
        data: {
          organizationId: patient.organizationId,
          action: "BLOOD_TRANSFUSION_ORDER_BLOCKED",
          entity: "Patient",
          entityId: patientId,
          details: { productOrdered, unitBloodType, patientBloodType, reason: blockReason }
        }
      });

      return NextResponse.json({ 
        success: true, 
        clearance: "blocked",
        reason: blockReason
      });
    }

    return NextResponse.json({ 
      success: true, 
      clearance: "approved"
    });

  } catch (error) {
    logger.error({ event: "agents.blood_bank_safety.failed", error });
    return NextResponse.json({ error: "Failed to run blood bank safety check" }, { status: 500 });
  }
}
