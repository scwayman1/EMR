"use server";

// EMR-143 — practice-level outreach campaign actions.
//
// A campaign targets a cohort (active vs. all, optionally filtered
// by qualification status), interpolates `{{firstName}}` / `{{lastName}}`,
// and persists per-recipient delivery state. In dev we mark recipients
// as `sent` immediately; production would queue a job per recipient
// against the SMS / email provider.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

const audienceSchema = z.object({
  status: z.enum(["all", "active"]).default("active"),
  qualified: z.boolean().optional(),
});

const campaignSchema = z.object({
  name: z.string().min(1).max(120),
  channel: z.enum(["sms", "email"]),
  bodyTemplate: z.string().min(1).max(1000),
  audience: audienceSchema,
  scheduledFor: z.string().datetime().optional().nullable(),
  sendNow: z.boolean().default(false),
});

export type CampaignResult =
  | { ok: true; campaignId: string; recipientCount: number }
  | { ok: false; error: string };

export async function createCampaignAction(
  _prev: CampaignResult | null,
  formData: FormData,
): Promise<CampaignResult> {
  const user = await requireUser();
  if (!user.organizationId) {
    return { ok: false, error: "No organization context." };
  }
  if (!user.roles.some((r) => r === "clinician" || r === "practice_owner" || r === "operator")) {
    return { ok: false, error: "You don't have permission to send broadcasts." };
  }

  const parsed = campaignSchema.safeParse({
    name: (formData.get("name") as string)?.trim(),
    channel: formData.get("channel"),
    bodyTemplate: (formData.get("bodyTemplate") as string)?.trim(),
    audience: {
      status: formData.get("audienceStatus") || "active",
      qualified: formData.get("audienceQualified") === "on",
    },
    scheduledFor: (formData.get("scheduledFor") as string) || null,
    sendNow: formData.get("sendNow") === "on",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid campaign payload.",
    };
  }

  // Resolve audience — never include patients without a phone (sms) or email.
  const where: Prisma.PatientWhereInput = {
    organizationId: user.organizationId,
    deletedAt: null,
  };
  if (parsed.data.audience.status === "active") {
    where.status = "active";
  }
  if (parsed.data.audience.qualified) {
    where.qualificationStatus = "qualified";
  }
  if (parsed.data.channel === "sms") {
    where.phone = { not: null };
  } else {
    where.email = { not: null };
  }

  const patients = await prisma.patient.findMany({
    where,
    select: { id: true },
    take: 5000,
  });

  if (patients.length === 0) {
    return { ok: false, error: "Audience filter matched zero patients." };
  }

  const isImmediate = parsed.data.sendNow;
  const status = isImmediate ? "sending" : "scheduled";

  const campaign = await prisma.outreachCampaign.create({
    data: {
      organizationId: user.organizationId,
      name: parsed.data.name,
      channel: parsed.data.channel,
      bodyTemplate: parsed.data.bodyTemplate,
      audienceFilter: parsed.data.audience,
      status,
      scheduledFor: parsed.data.scheduledFor
        ? new Date(parsed.data.scheduledFor)
        : null,
      createdById: user.id,
      startedAt: isImmediate ? new Date() : null,
      recipients: {
        create: patients.map((p) => ({
          patientId: p.id,
          status: "pending",
        })),
      },
    },
    select: { id: true },
  });

  // Dev-mode "send" — mark every recipient as sent. Production would
  // hand each row to a queued job that calls the SMS / email provider.
  if (isImmediate) {
    const now = new Date();
    await prisma.$transaction([
      prisma.outreachRecipient.updateMany({
        where: { campaignId: campaign.id },
        data: { status: "sent", sentAt: now },
      }),
      prisma.outreachCampaign.update({
        where: { id: campaign.id },
        data: { status: "completed", completedAt: now },
      }),
    ]);
  }

  revalidatePath("/clinic/communications");
  revalidatePath("/clinic/communications/broadcasts");
  return {
    ok: true,
    campaignId: campaign.id,
    recipientCount: patients.length,
  };
}

const cancelSchema = z.object({ campaignId: z.string().min(1) });

export async function cancelCampaignAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!user.organizationId) return { ok: false, error: "No organization." };

  const parsed = cancelSchema.safeParse({
    campaignId: formData.get("campaignId"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const campaign = await prisma.outreachCampaign.findFirst({
    where: {
      id: parsed.data.campaignId,
      organizationId: user.organizationId,
      status: { in: ["draft", "scheduled"] },
    },
    select: { id: true },
  });
  if (!campaign) {
    return {
      ok: false,
      error: "Campaign not found or already in flight.",
    };
  }

  await prisma.outreachCampaign.update({
    where: { id: campaign.id },
    data: { status: "cancelled" },
  });

  revalidatePath("/clinic/communications/broadcasts");
  return { ok: true };
}
