"use server";

import {
  createVideoRoom,
  createMeetingToken,
  deleteVideoRoom,
  type DailyRoom,
  type DailyToken,
} from "@/lib/domain/telehealth-sdk";

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
  const room = await createVideoRoom(encounterId);

  const [providerToken, patientToken] = await Promise.all([
    createMeetingToken(room.name, "Provider", true),
    createMeetingToken(room.name, "Patient", false),
  ]);

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
  await deleteVideoRoom(roomName);
}
