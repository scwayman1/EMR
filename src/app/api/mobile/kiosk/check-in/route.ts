import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { computeQueueTransition } from "@/lib/domain/visit-state";
import { logger } from "@/lib/observability/log";

const CheckInSchema = z.object({
  encounterId: z.string().min(1),
  patientId: z.string().min(1),
  signedForms: z.unknown().optional(),
});

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const secret = process.env.KIOSK_SECRET ?? "";

    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const parsed = CheckInSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const payload = parsed.data;
    const encounter = await prisma.encounter.findFirst({
      where: {
        id: payload.encounterId,
        patientId: payload.patientId,
      },
      include: {
        patient: {
          select: {
            id: true,
            intakeAnswers: true,
            organizationId: true,
          },
        },
      },
    });

    if (!encounter) {
      return NextResponse.json(
        { error: "Encounter not found for patient" },
        { status: 404 },
      );
    }

    if (encounter.organizationId !== encounter.patient.organizationId) {
      return NextResponse.json(
        { error: "Encounter organization mismatch" },
        { status: 409 },
      );
    }

    const next = computeQueueTransition(encounter, "checked_in");
    if (!next.ok) {
      return NextResponse.json({ error: next.error }, { status: 409 });
    }

    let status = next.data.status as string;
    if (next.data.status !== encounter.status) {
      const updated = await prisma.encounter.update({
        where: { id: encounter.id },
        data: next.data as Prisma.EncounterUpdateInput,
      });
      status = updated.status;

      await prisma.auditLog.create({
        data: {
          organizationId: encounter.organizationId,
          actorUserId: null,
          action: "encounter.kiosk_check_in.completed",
          subjectType: "Encounter",
          subjectId: encounter.id,
          metadata: {
            from: encounter.status,
            to: "checked_in",
            channel: "kiosk",
          },
        },
      });
    }

    if (payload.signedForms !== undefined) {
      await prisma.patient.update({
        where: { id: encounter.patient.id },
        data: {
          intakeAnswers: mergeSignedForms(
            encounter.patient.intakeAnswers,
            payload.signedForms,
          ) as Prisma.InputJsonValue,
        },
      });
    }

    logger.info({
      event: "kiosk.check_in.success",
      encounterId: encounter.id,
      patientId: payload.patientId,
    });

    return NextResponse.json({
      success: true,
      status,
    });

  } catch (error) {
    logger.error({ event: "kiosk.check_in.failed", error });
    return NextResponse.json({ error: "Failed to process kiosk check-in" }, { status: 500 });
  }
}

function mergeSignedForms(intakeAnswers: unknown, signedForms: unknown): Record<string, unknown> {
  const current = isRecord(intakeAnswers) ? intakeAnswers : {};
  const existingForms = isRecord(current.signedForms) ? current.signedForms : {};

  return {
    ...current,
    signedForms: {
      ...existingForms,
      ...(isRecord(signedForms) ? signedForms : { value: signedForms }),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
