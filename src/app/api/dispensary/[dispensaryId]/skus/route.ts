// EMR-002 — Dispensary SKU ingestion.
//
// POST /api/dispensary/[dispensaryId]/skus
//   Bulk-ingests a dispensary's product catalog. Each payload SKU maps to
//   one Product (matched by slug=`${dispensary.slug}-${sku}`) and one
//   ProductVariant (keyed by UPC or `${productId}:${sku}`).
//
// GET  /api/dispensary/[dispensaryId]/skus
//   Lists the dispensary's currently active SKUs (one row per variant).
//
// This is scaffolding — production will add: idempotency tokens, async
// background ingestion via AgentJob, image hosting, and a full diffing
// engine that auto-delists SKUs the dispensary stops syncing.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import type { DispensaryIngestSummary } from "@/lib/dispensary/types";

export const runtime = "nodejs";

const SkuSchema = z.object({
  sku: z.string().min(1).max(64),
  upc: z.string().max(32).optional(),
  name: z.string().min(1).max(200),
  brand: z.string().max(120).optional(),
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
  packSize: z.string().max(40).optional(),
  priceCents: z.number().int().nonnegative(),
  inStock: z.boolean(),
  inventoryCount: z.number().int().nonnegative().optional(),
  imageUrl: z.string().url().optional(),
  coaUrl: z.string().url().optional(),
  description: z.string().max(2000).optional(),
});

const IngestSchema = z.object({
  syncedAt: z.string().datetime().optional(),
  skus: z.array(SkuSchema).min(1).max(2000),
});

function isOperator(user: { roles: string[] }): boolean {
  return user.roles.includes("operator") || user.roles.includes("practice_owner");
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ dispensaryId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { dispensaryId } = await ctx.params;
  const dispensary = await prisma.vendor.findUnique({
    where: { id: dispensaryId },
    select: { id: true, organizationId: true, slug: true, vendorType: true },
  });
  if (!dispensary || dispensary.vendorType !== "licensed_dispensary") {
    return NextResponse.json({ error: "dispensary_not_found" }, { status: 404 });
  }
  if (dispensary.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const products = await prisma.product.findMany({
    where: {
      organizationId: dispensary.organizationId,
      slug: { startsWith: `${dispensary.slug}-` },
      deletedAt: null,
    },
    include: { variants: true },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  return NextResponse.json({
    dispensaryId,
    productCount: products.length,
    skus: products.flatMap((p) =>
      p.variants.map((v) => ({
        sku: v.name,
        upc: v.upc,
        productId: p.id,
        productSlug: p.slug,
        productName: p.name,
        priceCents: Math.round(v.price * 100),
        inStock: v.inStock,
        inventoryCount: v.inventoryCount,
        format: p.format,
        thcContent: p.thcContent,
        cbdContent: p.cbdContent,
      })),
    ),
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ dispensaryId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isOperator(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { dispensaryId } = await ctx.params;
  const dispensary = await prisma.vendor.findUnique({
    where: { id: dispensaryId },
    select: { id: true, organizationId: true, slug: true, vendorType: true, name: true },
  });
  if (!dispensary || dispensary.vendorType !== "licensed_dispensary") {
    return NextResponse.json({ error: "dispensary_not_found" }, { status: 404 });
  }
  if (dispensary.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = IngestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.format() },
      { status: 400 },
    );
  }

  const syncedAt = parsed.data.syncedAt ? new Date(parsed.data.syncedAt) : new Date();
  const summary: DispensaryIngestSummary = {
    dispensaryId,
    syncedAt: syncedAt.toISOString(),
    received: parsed.data.skus.length,
    created: 0,
    updated: 0,
    delisted: 0,
    errors: [],
  };

  for (const incoming of parsed.data.skus) {
    try {
      const productSlug = `${dispensary.slug}-${incoming.sku}`.toLowerCase();
      const product = await prisma.product.upsert({
        where: { slug: productSlug },
        update: {
          name: incoming.name,
          brand: incoming.brand ?? dispensary.name,
          description: incoming.description ?? incoming.name,
          format: incoming.format,
          price: incoming.priceCents / 100,
          imageUrl: incoming.imageUrl,
          coaUrl: incoming.coaUrl,
          thcContent: incoming.thcPercent ?? null,
          cbdContent: incoming.cbdPercent ?? null,
          strainType: incoming.strainType ?? null,
          inStock: incoming.inStock,
          inventoryCount: incoming.inventoryCount ?? 0,
          status: incoming.inStock ? "active" : "out_of_stock",
        },
        create: {
          organizationId: dispensary.organizationId,
          name: incoming.name,
          slug: productSlug,
          brand: incoming.brand ?? dispensary.name,
          description: incoming.description ?? incoming.name,
          format: incoming.format,
          price: incoming.priceCents / 100,
          imageUrl: incoming.imageUrl,
          coaUrl: incoming.coaUrl,
          thcContent: incoming.thcPercent ?? null,
          cbdContent: incoming.cbdPercent ?? null,
          strainType: incoming.strainType ?? null,
          inStock: incoming.inStock,
          inventoryCount: incoming.inventoryCount ?? 0,
          status: incoming.inStock ? "active" : "out_of_stock",
        },
        select: { id: true, createdAt: true, updatedAt: true },
      });

      const wasCreated = product.createdAt.getTime() === product.updatedAt.getTime();
      if (wasCreated) summary.created += 1;
      else summary.updated += 1;

      const existingVariant = await prisma.productVariant.findFirst({
        where: { productId: product.id, name: incoming.sku },
        select: { id: true },
      });
      if (existingVariant) {
        await prisma.productVariant.update({
          where: { id: existingVariant.id },
          data: {
            upc: incoming.upc ?? null,
            price: incoming.priceCents / 100,
            inStock: incoming.inStock,
            inventoryCount: incoming.inventoryCount ?? 0,
          },
        });
      } else {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            name: incoming.sku,
            upc: incoming.upc ?? null,
            price: incoming.priceCents / 100,
            inStock: incoming.inStock,
            inventoryCount: incoming.inventoryCount ?? 0,
          },
        });
      }
    } catch (err) {
      summary.errors.push({
        sku: incoming.sku,
        reason: err instanceof Error ? err.message : "unknown_error",
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      organizationId: dispensary.organizationId,
      actorUserId: user.id,
      action: "dispensary.skus.ingested",
      subjectType: "Vendor",
      subjectId: dispensary.id,
      metadata: {
        received: summary.received,
        created: summary.created,
        updated: summary.updated,
        errorCount: summary.errors.length,
        syncedAt: summary.syncedAt,
      },
    },
  });

  return NextResponse.json({ summary });
}
