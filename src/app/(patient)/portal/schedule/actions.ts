"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import type { AppointmentType } from "@/lib/domain/scheduling";

interface BookAppointmentInput {
  patientId: string;
  providerId: string;
  slotDate: string;
  slotStartTime: string;
  appointmentType: AppointmentType;
  modality: "in_person" | "video" | "phone";
  reason?: string;
}

export async function bookAppointment(input: BookAppointmentInput) {
  const user = await requireUser();

  // Verify the patient belongs to this user
  const patient = await prisma.patient.findFirst({
    where: { id: input.patientId, userId: user.id, deletedAt: null },
  });

  if (!patient) {
    throw new Error("Patient not found or unauthorized.");
  }

  // Build start and end times
  const [hours, minutes] = input.slotStartTime.split(":").map(Number);
  const startAt = new Date(`${input.slotDate}T${input.slotStartTime}:00`);
  const durationMinutes = input.appointmentType === "new_patient" ? 60 : 30;
  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

  // Create the appointment with "requested" status
  const appointment = await prisma.appointment.create({
    data: {
      patientId: input.patientId,
      providerId: input.providerId,
      status: "requested",
      startAt,
      endAt,
      modality: input.modality === "in_person" ? "in_person" : "video",
      notes: input.reason ?? null,
    },
  });

  return { id: appointment.id };
}
