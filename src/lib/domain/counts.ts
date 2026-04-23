import { prisma } from "@/lib/db/prisma";

export async function getPatientCounts(patientId: string) {
  const [unreadMessages, openTasks, pendingAssessments] = await Promise.all([
    prisma.message.count({
      where: { thread: { patientId }, status: "sent", senderUserId: { not: null } },
    }),
    prisma.task.count({ where: { patientId, status: "open" } }),
    prisma.task.count({
      where: { patientId, status: "open", title: { contains: "assessment" } },
    }),
  ]);
  return { unreadMessages, openTasks, pendingAssessments };
}

export async function getClinicCounts(organizationId: string) {
  const [activePatients, openNotes, pendingApprovals, unreadThreads] = await Promise.all([
    prisma.patient.count({ where: { organizationId, status: "active" } }),
    prisma.note.count({ where: { status: "draft", encounter: { organizationId } } }),
    prisma.agentJob.count({ where: { organizationId, status: "needs_approval" } }),
    prisma.messageThread.count({
      where: {
        patient: { organizationId },
        messages: { some: { status: "sent" } },
      },
    }),
  ]);
  return { activePatients, openNotes, pendingApprovals, unreadThreads };
}

export async function getOpsCounts(organizationId: string) {
  const [prospects, activePatients, openTasks, pendingApprovals, failedJobs] = await Promise.all([
    prisma.patient.count({ where: { organizationId, status: "prospect" } }),
    prisma.patient.count({ where: { organizationId, status: "active" } }),
    prisma.task.count({ where: { organizationId, status: "open" } }),
    prisma.agentJob.count({ where: { organizationId, status: "needs_approval" } }),
    prisma.agentJob.count({ where: { organizationId, status: "failed" } }),
  ]);
  return { prospects, activePatients, openTasks, pendingApprovals, failedJobs };
}
