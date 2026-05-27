// EMR-242 — daily COA tracker cron.
//
// Runs once per day. Two responsibilities:
//   1. Sweep products whose linked COA has expired → set status to
//      'archived' (auto-delist). Conversely, re-list products whose
//      COA has been renewed.
//   2. Find COAs expiring on the 30 / 14 / 7-day reminder buckets
//      and emit ReminderRequested events for the email layer to
//      consume. We don't send mail directly — that's the email
//      service's job, and it isn't wired yet.
//
// Auth: shared CRON_SECRET header. The deployment environment
// schedules a daily HTTP POST against this route.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  computeCoaSweep,
  reminderBucketFor,
  COA_REMINDER_DAYS_AHEAD,
} from "@/lib/marketplace/coa-tracker";

export const runtime = "nodejs";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = req.headers.get("x-cron-secret");
  return provided === secret;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // 1) Auto-delist / re-list sweep.
  // Pull only products that have a linked COA OR are currently active
  // — the rest are draft / never had a COA and aren't candidates for
  // status churn.
  const products = await prisma.product.findMany({
    where: {
      OR: [{ coaDocumentId: { not: null } }, { status: "active" }],
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      slug: true,
      brand: true,
      description: true,
      shortDescription: true,
      price: true,
      compareAtPrice: true,
      status: true,
      format: true,
      imageUrl: true,
      images: true,
      thcContent: true,
      cbdContent: true,
      cbnContent: true,
      thcvContent: true,
      terpeneProfile: true,
      strainType: true,
      symptoms: true,
      goals: true,
      useCases: true,
      onsetTime: true,
      duration: true,
      dosageGuidance: true,
      beginnerFriendly: true,
      bgColor: true,
      deepColor: true,
      displayShape: true,
      doseLabel: true,
      outcomePct: true,
      outcomeSampleSize: true,
      labVerified: true,
      coaUrl: true,
      coaDocumentId: true,
      clinicianPick: true,
      clinicianNote: true,
      requires21Plus: true,
      inStock: true,
      inventoryCount: true,
      averageRating: true,
      reviewCount: true,
      sortOrder: true,
      featured: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Fetch the COAs in one query.
  const coaIds = Array.from(
    new Set(products.map((p) => p.coaDocumentId).filter((id): id is string => !!id)),
  );
  const coas = coaIds.length
    ? await prisma.vendorDocument.findMany({ where: { id: { in: coaIds } } })
    : [];
  const coaById = new Map(coas.map((c) => [c.id, c]));

  const productsWithCoa = products.map((p) => ({
    ...(p as unknown as Parameters<typeof computeCoaSweep>[0]["products"][number]),
    coa: p.coaDocumentId ? coaById.get(p.coaDocumentId) ?? null : null,
  }));

  const sweep = computeCoaSweep({ products: productsWithCoa, now });

  if (sweep.delist.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: sweep.delist.map((d) => d.productId) } },
      data: { status: "archived" },
    });
  }
  if (sweep.relist.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: sweep.relist } },
      data: { status: "active" },
    });
  }

  // 2) Reminder buckets — emit a structured AuditLog row per
  //    expiring COA so the email layer can pick them up. Once the
  //    email service is wired this step gets a side-effecting send.
  const reminderWindow = await prisma.vendorDocument.findMany({
    where: {
      documentType: "coa",
      expiresAt: {
        // Pre-filter to "expires within the largest reminder window"
        // so we don't pull every COA on every cron run.
        gte: now,
        lte: new Date(now.getTime() + (Math.max(...COA_REMINDER_DAYS_AHEAD) + 1) * 86_400_000),
      },
    },
    select: { id: true, vendorId: true, organizationId: true, expiresAt: true },
  });

  const reminders: Array<{ documentId: string; vendorId: string; daysUntil: number }> = [];
  for (const doc of reminderWindow) {
    if (!doc.expiresAt) continue;
    const { bucket } = reminderBucketFor(doc.expiresAt, now);
    if (bucket === null) continue;
    reminders.push({ documentId: doc.id, vendorId: doc.vendorId, daysUntil: bucket });
    await prisma.auditLog.create({
      data: {
        organizationId: doc.organizationId,
        action: "vendor.coa.reminder_due",
        subjectType: "VendorDocument",
        subjectId: doc.id,
        metadata: { vendorId: doc.vendorId, daysUntil: bucket },
      },
    });
  }

  return NextResponse.json({
    ok: true,
    delisted: sweep.delist.length,
    relisted: sweep.relist.length,
    remindersDue: reminders.length,
    reminders,
  });
}
