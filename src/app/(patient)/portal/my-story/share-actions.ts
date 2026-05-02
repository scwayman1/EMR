"use server";

import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  createPatientShareLink,
  PATIENT_SHARE_TTL_HOURS,
} from "@/lib/patient/share-link";

export interface ShareLinkResult {
  ok: boolean;
  url?: string;
  expiresAt?: string;
  ttlHours?: number;
  error?: string;
}

export async function createShareLink(): Promise<ShareLinkResult> {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!patient) {
    return { ok: false, error: "Patient profile not found" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://leafjourney.com";
  const link = createPatientShareLink(patient.id, baseUrl);

  return {
    ok: true,
    url: link.url,
    expiresAt: link.expiresAt.toISOString(),
    ttlHours: PATIENT_SHARE_TTL_HOURS,
  };
}
