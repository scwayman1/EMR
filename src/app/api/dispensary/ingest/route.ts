// EMR-002 — Dispensary catalog ingest endpoint.
//
// POST a snapshot of the dispensary's current SKUs. The handler
// reconciles to DispensarySku, soft-delisting anything that wasn't in
// the snapshot. Auth is by shared secret in the `X-Dispensary-Secret`
// header — set by the dispensary's POS integration script.
//
// Future hardening: rotate per-dispensary secrets stored on the
// Dispensary row instead of a single env-wide secret.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  ingestDispensaryCatalog,
  prismaDispensaryStorage,
} from "@/lib/dispensary";

export const runtime = "nodejs";

const SkuSchema = z.object({
  sku: z.string().min(1).max(64),
  upc: z.string().optional(),
  name: z.string().min(1),
  brand: z.string().optional(),
  format: z.enum([
    "flower",
    "preroll",
    "vape",
    "concentrate",
    "edible",
    "tincture",
    "topical",
    "capsule",
    "beverage",
    "other",
  ]),
  strainType: z.enum(["indica", "sativa", "hybrid", "n/a"]).optional(),
  thcMgPerUnit: z.number().nonnegative().optional(),
  cbdMgPerUnit: z.number().nonnegative().optional(),
  thcPercent: z.number().min(0).max(100).optional(),
  cbdPercent: z.number().min(0).max(100).optional(),
  packSize: z.string().optional(),
  priceCents: z.number().int().nonnegative(),
  inStock: z.boolean(),
  inventoryCount: z.number().int().nonnegative().optional(),
  imageUrl: z.string().url().optional(),
  coaUrl: z.string().url().optional(),
  description: z.string().optional(),
});

const RequestSchema = z.object({
  dispensaryId: z.string().min(1),
  syncedAt: z.string(),
  skus: z.array(SkuSchema).max(5000),
});

export async function POST(req: Request) {
  const secret = req.headers.get("x-dispensary-secret");
  const expected = process.env.DISPENSARY_INGEST_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_payload", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const dispensary = await prisma.dispensary.findUnique({
    where: { id: body.dispensaryId },
    select: { id: true, status: true },
  });
  if (!dispensary) {
    return NextResponse.json({ error: "dispensary_not_found" }, { status: 404 });
  }
  if (dispensary.status !== "active") {
    return NextResponse.json({ error: "dispensary_inactive" }, { status: 409 });
  }

  const { summary } = await ingestDispensaryCatalog(
    prismaDispensaryStorage,
    body,
  );

  return NextResponse.json({ ok: true, summary });
}
