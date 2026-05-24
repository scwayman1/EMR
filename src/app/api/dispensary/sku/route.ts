// EMR-002 — Scanned SKU lookup endpoint.
//
// GET /api/dispensary/sku?sku=ABC-123
// Returns the active DispensarySku row matching the supplied SKU code,
// or 404 if none is found. Used by the patient-side scanner to resolve
// a barcode to a product.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sku = url.searchParams.get("sku")?.trim() ?? "";
  if (sku.length === 0) {
    return NextResponse.json({ error: "sku_required" }, { status: 400 });
  }

  const row = await prisma.dispensarySku.findFirst({
    where: {
      active: true,
      OR: [
        { sku },
        { upc: sku },
      ],
    },
    select: {
      id: true,
      dispensaryId: true,
      sku: true,
      upc: true,
      name: true,
      brand: true,
      format: true,
      strainType: true,
      thcMgPerUnit: true,
      cbdMgPerUnit: true,
      thcPercent: true,
      cbdPercent: true,
      packSize: true,
      priceCents: true,
      inStock: true,
      inventoryCount: true,
      imageUrl: true,
      coaUrl: true,
      description: true,
    },
  });

  if (!row) {
    return NextResponse.json({ error: "sku_not_found" }, { status: 404 });
  }

  return NextResponse.json(row);
}
