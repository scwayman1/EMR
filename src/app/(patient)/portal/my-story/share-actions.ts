"use server";

import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { generateShareToken } from "@/lib/auth/share-tokens";

export interface ShareLinkResult {
  ok: boolean;
  url?: string;
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

  const token = generateShareToken(patient.id);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://leafjourney.com";
  const url = `${baseUrl}/share/${token}`;

  return { ok: true, url };
}
