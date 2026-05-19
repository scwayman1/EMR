"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

/**
 * EMR-655 — createPatient server action
 * -------------------------------------
 * Creates a Patient + 3 emergency contacts + 1 PatientCoverage row in a
 * single $transaction so a clinician adding a patient from the roster modal
 * never lands on a partially-populated chart.
 *
 * Schema notes (read these before changing the model):
 * - There is no dedicated `EmergencyContact` model in the Prisma schema as
 *   of 2026-05. To avoid a migration from this slice we stash the contact
 *   array on `Patient.intakeAnswers.emergencyContacts` (JSON). The portal
 *   profile form uses the same `intakeAnswers` blob for demographics that
 *   don't yet have columns (sex/race/maritalStatus/uniqueThing), so we're
 *   following the established escape hatch.
 * - Insurance maps to the existing `PatientCoverage` model (type = primary).
 *   The shape mirrors the fields the modal collects.
 */

const personalSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  dateOfBirth: z.string().optional().default(""),
  email: z.string().email("Invalid email").or(z.literal("")).optional().default(""),
  phone: z.string().max(30).optional().default(""),
  addressLine1: z.string().max(200).optional().default(""),
  addressLine2: z.string().max(200).optional().default(""),
  city: z.string().max(100).optional().default(""),
  state: z.string().max(50).optional().default(""),
  postalCode: z.string().max(20).optional().default(""),
  sex: z.string().max(50).optional().default(""),
  race: z.string().max(100).optional().default(""),
  maritalStatus: z.string().max(50).optional().default(""),
  // Photo arrives as a data URL — we stash it on intakeAnswers for now.
  // A real upload pipeline (S3 / Supabase Storage) is out of scope for
  // EMR-655; the field is purely so the modal can echo it back later.
  avatarDataUrl: z.string().max(5_000_000).optional().default(""),
});

const emergencyContactSchema = z.object({
  name: z.string().trim().min(1, "Contact name is required").max(120),
  phone: z.string().trim().min(1, "Contact phone is required").max(30),
  email: z.string().email("Invalid contact email").or(z.literal("")).optional().default(""),
  relationship: z.string().trim().min(1, "Relationship is required").max(60),
});

const insuranceSchema = z.object({
  payerName: z.string().trim().min(1, "Insurance payer is required").max(120),
  memberId: z.string().trim().min(1, "Member ID is required").max(60),
  groupNumber: z.string().max(60).optional().default(""),
  planName: z.string().max(120).optional().default(""),
  subscriberName: z.string().max(120).optional().default(""),
  relationshipToSubscriber: z.string().max(40).optional().default("self"),
});

const inputSchema = z.object({
  personal: personalSchema,
  // Exactly three emergency contacts per the ticket spec.
  emergencyContacts: z.array(emergencyContactSchema).length(3, "Exactly 3 emergency contacts are required"),
  insurance: insuranceSchema,
});

export type CreatePatientInput = z.infer<typeof inputSchema>;

export type CreatePatientResult =
  | { ok: true; patientId: string }
  | { ok: false; error: string };

export async function createPatient(
  input: CreatePatientInput,
): Promise<CreatePatientResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { ok: false, error: first?.message ?? "Invalid input." };
  }

  const user = await requireUser();
  const organizationId = user.organizationId;
  if (!organizationId) {
    return { ok: false, error: "No organization on session." };
  }

  const { personal, emergencyContacts, insurance } = parsed.data;

  try {
    const patientId = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          organizationId,
          status: "prospect",
          firstName: personal.firstName,
          lastName: personal.lastName,
          dateOfBirth: personal.dateOfBirth ? new Date(personal.dateOfBirth) : null,
          email: personal.email || null,
          phone: personal.phone || null,
          addressLine1: personal.addressLine1 || null,
          addressLine2: personal.addressLine2 || null,
          city: personal.city || null,
          state: personal.state || null,
          postalCode: personal.postalCode || null,
          intakeAnswers: {
            sex: personal.sex || undefined,
            race: personal.race || undefined,
            maritalStatus: personal.maritalStatus || undefined,
            avatarDataUrl: personal.avatarDataUrl || undefined,
            // Stored as JSON until a dedicated EmergencyContact model lands.
            emergencyContacts: emergencyContacts.map((c) => ({
              name: c.name,
              phone: c.phone,
              email: c.email || undefined,
              relationship: c.relationship,
            })),
          } as any,
        },
      });

      await tx.patientCoverage.create({
        data: {
          patientId: patient.id,
          type: "primary",
          payerName: insurance.payerName,
          memberId: insurance.memberId,
          groupNumber: insurance.groupNumber || null,
          planName: insurance.planName || null,
          subscriberName: insurance.subscriberName || null,
          relationshipToSubscriber:
            insurance.relationshipToSubscriber || "self",
          active: true,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: user.id,
          action: "patient.created",
          subjectType: "Patient",
          subjectId: patient.id,
          metadata: {
            source: "clinic.patients.new_patient_modal",
            emergencyContactCount: emergencyContacts.length,
            hasInsurance: true,
          },
        },
      });

      return patient.id;
    });

    revalidatePath("/clinic/patients");

    return { ok: true, patientId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to create patient.",
    };
  }
}
