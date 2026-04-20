import { prisma } from "@/lib/db/prisma";

// ---------------------------------------------------------------------------
// Morning Brief — AI context builder
// ---------------------------------------------------------------------------
// Pure-shape counts used to feed the AI-synthesized overview at the top of
// /clinic/morning-brief. Each field is a small indexed query; the whole call
// is under 200ms against a seeded dev DB.
//
// Why this lives in domain/ and not in the page: we want deterministic tests
// (see morning-brief.test.ts) against the shape without booting Next, and we
// want the synthesizer agent (src/lib/agents/morning-brief-synthesizer.ts) to
// be able to depend on the context shape without depending on the page.
// ---------------------------------------------------------------------------

export interface BriefContext {
  /** The calendar date the brief was built for (local midnight). */
  date: Date;
  /** Number of encounters scheduled for `date` in the org. */
  appointmentsToday: number;
  /** AgentJobs in needs_approval for the org. */
  pendingApprovals: number;
  /** LabResults received in the last 24h that are not yet signed. */
  newLabsToday: number;
  /**
   * Emergency-tagged message threads (triageUrgency = "emergency") with at
   * least one unread/unresponded message in the last 48h. Strings identify
   * the patient ("First L.") for the AI prompt; we do not send full PHI.
   */
  emergencyFlags: string[];
  /**
   * True when anything is worth the clinician's immediate attention —
   * either an emergency flag or a pile of pending approvals.
   */
  hasCriticalSignal: boolean;
}

/**
 * Build the AI synthesis context for the clinician morning brief.
 *
 * All queries are scoped to the organization. We deliberately keep this
 * narrow: the synthesizer is a summary, not a dashboard. The page itself
 * already renders the long-form checklist from its own queries.
 *
 * @param organizationId  Org scope.
 * @param clinicianId     Provider/user id. Reserved for future per-clinician
 *                        filtering (their encounters only). Today the brief
 *                        is org-wide; the parameter stays so callers don't
 *                        have to change signatures when we narrow it.
 * @param date            Local calendar date to build the brief for.
 */
export async function buildBriefContext(
  organizationId: string,
  clinicianId: string,
  date: Date
): Promise<BriefContext> {
  void clinicianId; // reserved — see JSDoc

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const [appointmentsToday, pendingApprovals, newLabsToday, emergencyThreads] =
    await Promise.all([
      prisma.encounter.count({
        where: {
          organizationId,
          scheduledFor: { gte: dayStart, lt: dayEnd },
        },
      }),

      prisma.agentJob.count({
        where: { organizationId, status: "needs_approval" },
      }),

      prisma.labResult.count({
        where: {
          organizationId,
          receivedAt: { gte: twentyFourHoursAgo },
          signedAt: null,
        },
      }),

      prisma.messageThread.findMany({
        where: {
          patient: { organizationId },
          triageUrgency: "emergency",
          lastMessageAt: { gte: fortyEightHoursAgo },
        },
        select: {
          patient: { select: { firstName: true, lastName: true } },
          triageSummary: true,
        },
        take: 5,
        orderBy: { lastMessageAt: "desc" },
      }),
    ]);

  const emergencyFlags = emergencyThreads.map((t) => {
    const initial = t.patient.lastName?.[0] ?? "";
    const name = `${t.patient.firstName ?? "Patient"} ${initial}.`.trim();
    return t.triageSummary ? `${name}: ${t.triageSummary}` : name;
  });

  const hasCriticalSignal = emergencyFlags.length > 0 || pendingApprovals >= 5;

  return {
    date: dayStart,
    appointmentsToday,
    pendingApprovals,
    newLabsToday,
    emergencyFlags,
    hasCriticalSignal,
  };
}
