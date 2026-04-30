// EMR-002 / EMR-017 — Prisma adapter for dispensary persistence.
//
// Implements the IngestStorage contract from `./ingest` against the
// real DispensarySku table, and exposes simple read queries for the
// locator pages.

import { prisma } from "@/lib/db/prisma";
import type { ExistingSkuRow, IngestStorage } from "./ingest";
import type { DispensaryRow } from "./locator";

export const prismaDispensaryStorage: IngestStorage = {
  async listActiveSkus(dispensaryId: string): Promise<ExistingSkuRow[]> {
    const rows = await prisma.dispensarySku.findMany({
      where: { dispensaryId, active: true },
      select: { id: true, sku: true, active: true },
    });
    return rows;
  },

  async upsertSku(input) {
    const existing = await prisma.dispensarySku.findUnique({
      where: { dispensaryId_sku: { dispensaryId: input.dispensaryId, sku: input.sku } },
    });
    await prisma.dispensarySku.upsert({
      where: { dispensaryId_sku: { dispensaryId: input.dispensaryId, sku: input.sku } },
      create: {
        dispensaryId: input.dispensaryId,
        sku: input.sku,
        upc: input.upc,
        name: input.name,
        brand: input.brand,
        format: input.format,
        strainType: input.strainType,
        thcMgPerUnit: input.thcMgPerUnit,
        cbdMgPerUnit: input.cbdMgPerUnit,
        thcPercent: input.thcPercent,
        cbdPercent: input.cbdPercent,
        packSize: input.packSize,
        priceCents: input.priceCents,
        inStock: input.inStock,
        inventoryCount: input.inventoryCount,
        imageUrl: input.imageUrl,
        coaUrl: input.coaUrl,
        description: input.description,
        active: true,
      },
      update: {
        upc: input.upc,
        name: input.name,
        brand: input.brand,
        format: input.format,
        strainType: input.strainType,
        thcMgPerUnit: input.thcMgPerUnit,
        cbdMgPerUnit: input.cbdMgPerUnit,
        thcPercent: input.thcPercent,
        cbdPercent: input.cbdPercent,
        packSize: input.packSize,
        priceCents: input.priceCents,
        inStock: input.inStock,
        inventoryCount: input.inventoryCount,
        imageUrl: input.imageUrl,
        coaUrl: input.coaUrl,
        description: input.description,
        active: true,
      },
    });
    return { created: !existing };
  },

  async delistSkus(ids: string[]) {
    if (ids.length === 0) return;
    await prisma.dispensarySku.updateMany({
      where: { id: { in: ids } },
      data: { active: false, inStock: false },
    });
  },

  async markDispensarySynced(dispensaryId: string, syncedAt: Date) {
    await prisma.dispensary.update({
      where: { id: dispensaryId },
      data: { lastSyncedAt: syncedAt },
    });
  },
};

/**
 * Read every dispensary owned by the org, with a count of active +
 * in-stock SKUs. The locator pages use this to render distance-sorted
 * cards.
 */
export async function listDispensariesForOrg(
  organizationId: string,
): Promise<DispensaryRow[]> {
  const rows = await prisma.dispensary.findMany({
    where: { organizationId },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      latitude: true,
      longitude: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      phone: true,
      websiteUrl: true,
      hoursLine: true,
      lastSyncedAt: true,
      _count: { select: { skus: { where: { active: true, inStock: true } } } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    status: r.status,
    latitude: r.latitude,
    longitude: r.longitude,
    addressLine1: r.addressLine1,
    addressLine2: r.addressLine2,
    city: r.city,
    state: r.state,
    postalCode: r.postalCode,
    phone: r.phone,
    websiteUrl: r.websiteUrl,
    hoursLine: r.hoursLine,
    lastSyncedAt: r.lastSyncedAt,
    skuCount: r._count.skus,
  }));
}
