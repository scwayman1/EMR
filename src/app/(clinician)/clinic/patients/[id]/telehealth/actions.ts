"use server";

import {
  createVideoRoom,
  createMeetingToken,
  deleteVideoRoom,
  type DailyRoom,
  type DailyToken,
} from "@/lib/domain/telehealth-sdk";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

export interface TelehealthVisitResult {
  room: DailyRoom;
  providerToken: DailyToken;
  patientToken: DailyToken;
  providerJoinUrl: string;
  patientJoinUrl: string;
}

/**
 * Start a telehealth visit by creating a Daily.co room + tokens for provider and patient.
 */
export async function startTelehealthVisit(
  patientId: string,
  encounterId: string,
): Promise<TelehealthVisitResult> {
  const user = await requireUser();
  if (!user.roles.some((r) => r === "clinician" || r === "practice_owner")) {
    throw new Error("Clinician role required");
  }
  if (!user.organizationId) throw new Error("Telehealth encounter not found");

  const encounter = await prisma.encounter.findFirst({
    where: {
      id: encounterId,
      patientId,
      organizationId: user.organizationId,
      modality: "video",
      patient: { deletedAt: null },
    },
    select: { id: true, patientId: true, organizationId: true },
  });

  if (!encounter) throw new Error("Telehealth encounter not found");

  const room = await createVideoRoom(encounterId);

  const [providerToken, patientToken] = await Promise.all([
    createMeetingToken(room.name, "Provider", true),
    createMeetingToken(room.name, "Patient", false),
  ]);

  await prisma.callLog.create({
    data: {
      organizationId: user.organizationId,
      channel: "video",
      direction: "outbound",
      status: "in_progress",
      initiatorUserId: user.id,
      patientId,
      externalSessionId: room.name,
      notes: `Telehealth room for encounter ${encounter.id}`,
    },
  });

  const providerJoinUrl = `${room.url}?t=${providerToken.token}`;
  const patientJoinUrl = `${room.url}?t=${patientToken.token}`;

  return {
    room,
    providerToken,
    patientToken,
    providerJoinUrl,
    patientJoinUrl,
  };
}

/**
 * End a telehealth visit by deleting the Daily.co room (cleanup).
 */
export async function endTelehealthVisit(roomName: string): Promise<void> {
  const user = await requireUser();
  if (!user.roles.some((r) => r === "clinician" || r === "practice_owner")) {
    throw new Error("Clinician role required");
  }
  if (!user.organizationId) throw new Error("Telehealth room not found");

  const call = await prisma.callLog.findFirst({
    where: {
      organizationId: user.organizationId,
      channel: "video",
      externalSessionId: roomName,
    },
    select: { id: true },
  });

  if (!call) throw new Error("Telehealth room not found");

  await deleteVideoRoom(roomName);
  await prisma.callLog.update({
    where: { id: call.id },
    data: {
      status: "completed",
      endedAt: new Date(),
    },
  });
}
