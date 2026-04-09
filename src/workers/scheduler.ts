// Scheduler cron job. Runs every 15 minutes on Render and enqueues
// recurring workflows: outcome check-ins, intake nudges, practice launch
// readiness refresh.
//
// This is a one-shot script — it runs, enqueues, and exits.

import { prisma } from "../lib/db/prisma";
import { dispatch } from "../lib/orchestration/dispatch";

async function main() {
  console.log("[scheduler] tick");

  // 1. Outcome tracker refresh for every active patient that's been active
  //    in the last 30 days but has no check-in logged in the last 5 days.
  const cutoffActive = new Date(Date.now() - 30 * 86400000);
  const cutoffCheckin = new Date(Date.now() - 5 * 86400000);

  const patients = await prisma.patient.findMany({
    where: {
      status: "active",
      updatedAt: { gte: cutoffActive },
      outcomeLogs: { none: { loggedAt: { gte: cutoffCheckin } } },
    },
    select: { id: true, organizationId: true },
  });

  for (const p of patients) {
    await dispatch({
      name: "encounter.completed",
      encounterId: `virtual:${p.id}`,
      patientId: p.id,
      completedAt: new Date(),
    });
  }

  // 2. Intake stalled nudge for prospects with incomplete intake > 48h.
  const cutoffStalled = new Date(Date.now() - 48 * 3600000);
  const stalled = await prisma.patient.findMany({
    where: {
      status: "prospect",
      updatedAt: { lte: cutoffStalled },
    },
    select: { id: true, organizationId: true },
  });

  for (const p of stalled) {
    await dispatch({
      name: "patient.intake.stalled",
      patientId: p.id,
      organizationId: p.organizationId,
      intent: "intake_nudge",
    });
  }

  console.log(`[scheduler] enqueued outcome=${patients.length} stalled=${stalled.length}`);
}

main()
  .catch((err) => {
    console.error("[scheduler] error", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
