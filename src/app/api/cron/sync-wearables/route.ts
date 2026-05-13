import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { evaluatePatientCDS } from "@/lib/cds/engine";
import { routeCDSTriggers } from "@/lib/cds/alerts";
import { whoopClient } from "@/lib/integrations/whoop-mapper";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const patients = await prisma.patient.findMany({
    take: 10,
    select: { id: true, organizationId: true },
  });

  const today = new Date().toISOString().split("T")[0];

  for (const patient of patients) {
    try {
      await whoopClient.syncPatientData(patient.id, "dummy_token", today);

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentLogs = await prisma.outcomeLog.findMany({
        where: { patientId: patient.id, loggedAt: { gte: twentyFourHoursAgo } },
      });
      const recentObservations = await prisma.clinicalObservation.findMany({
        where: { patientId: patient.id, createdAt: { gte: twentyFourHoursAgo } },
      });

      const triggers = evaluatePatientCDS(
        patient.id,
        recentLogs,
        recentObservations,
      );

      if (triggers.length > 0) {
        await routeCDSTriggers(triggers);
      }
    } catch (error) {
      console.error(`[SyncDaemon] Failed to sync patient ${patient.id}:`, error);
    }
  }

  return NextResponse.json({ success: true, processed: patients.length });
}
