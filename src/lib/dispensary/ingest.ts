// EMR-002 — Dispensary catalog ingestion.
//
// Dispensaries POST a snapshot of their current SKUs; we reconcile to
// the DispensarySku table: insert new rows, update existing ones, and
// soft-delist anything that vanished from the snapshot. This keeps a
// single source of truth on our side without requiring delete events
// from the upstream POS.

import type {
  DispensaryFormat,
  DispensaryIngestRequest,
  DispensaryIngestSummary,
  DispensarySkuPayload,
} from "./types";

export type DispensaryFormatDb =
  | "flower"
  | "preroll"
  | "vape"
  | "concentrate"
  | "edible"
  | "tincture"
  | "topical"
  | "capsule"
  | "beverage"
  | "other";

export type StrainClassificationDb =
  | "indica"
  | "sativa"
  | "hybrid"
  | "cbd"
  | "na";

export interface ExistingSkuRow {
  id: string;
  sku: string;
  active: boolean;
}

export interface IngestStorage {
  /** All currently-active SKU rows for this dispensary. */
  listActiveSkus(dispensaryId: string): Promise<ExistingSkuRow[]>;
  upsertSku(input: {
    dispensaryId: string;
    sku: string;
    upc?: string;
    name: string;
    brand?: string;
    format: DispensaryFormatDb;
    strainType: StrainClassificationDb;
    thcMgPerUnit?: number;
    cbdMgPerUnit?: number;
    thcPercent?: number;
    cbdPercent?: number;
    packSize?: string;
    priceCents: number;
    inStock: boolean;
    inventoryCount?: number;
    imageUrl?: string;
    coaUrl?: string;
    description?: string;
  }): Promise<{ created: boolean }>;
  delistSkus(ids: string[]): Promise<void>;
  markDispensarySynced(dispensaryId: string, syncedAt: Date): Promise<void>;
}

/**
 * Validate a single SKU payload. Returns null when the row is good,
 * a string reason when it should be rejected.
 */
export function validateSku(
  payload: DispensarySkuPayload,
): string | null {
  if (!payload.sku || payload.sku.trim().length === 0) {
    return "sku required";
  }
  if (payload.sku.length > 64) {
    return "sku exceeds 64 chars";
  }
  if (!payload.name || payload.name.trim().length === 0) {
    return "name required";
  }
  if (!Number.isFinite(payload.priceCents) || payload.priceCents < 0) {
    return "priceCents must be a non-negative integer";
  }
  if (!Number.isInteger(payload.priceCents)) {
    return "priceCents must be an integer (cents, not dollars)";
  }
  // Reject patently absurd prices — guards against $9.99 sneaking in
  // as 9.99 cents. $50,000 is a hard ceiling for any legitimate SKU.
  if (payload.priceCents > 5_000_000) {
    return "priceCents exceeds 5,000,000 (likely sent dollars instead of cents)";
  }
  if (payload.thcPercent !== undefined && (payload.thcPercent < 0 || payload.thcPercent > 100)) {
    return "thcPercent must be between 0 and 100";
  }
  if (payload.cbdPercent !== undefined && (payload.cbdPercent < 0 || payload.cbdPercent > 100)) {
    return "cbdPercent must be between 0 and 100";
  }
  return null;
}

const FORMAT_VALUES: ReadonlyArray<DispensaryFormat> = [
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
];

export function normalizeFormat(format: string): DispensaryFormatDb {
  const lower = format.toLowerCase().trim();
  if ((FORMAT_VALUES as ReadonlyArray<string>).includes(lower)) {
    return lower as DispensaryFormatDb;
  }
  // Common aliases from POS systems
  if (lower === "pre-roll" || lower === "joint") return "preroll";
  if (lower === "cartridge" || lower === "vape pen") return "vape";
  if (lower === "gummy" || lower === "chocolate") return "edible";
  if (lower === "drink" || lower === "soda") return "beverage";
  if (lower === "wax" || lower === "shatter" || lower === "rosin") return "concentrate";
  if (lower === "salve" || lower === "balm" || lower === "lotion") return "topical";
  return "other";
}

export function normalizeStrainType(t: string | undefined): StrainClassificationDb {
  if (!t) return "na";
  const lower = t.toLowerCase().trim();
  if (lower === "indica" || lower === "sativa" || lower === "hybrid" || lower === "cbd") {
    return lower;
  }
  if (lower === "n/a" || lower === "none" || lower === "") return "na";
  return "na";
}

export interface IngestResult {
  summary: DispensaryIngestSummary;
}

/**
 * Reconcile an incoming catalog snapshot against the current state.
 * SKUs not present in the snapshot are soft-delisted (active=false).
 */
export async function ingestDispensaryCatalog(
  storage: IngestStorage,
  request: DispensaryIngestRequest,
): Promise<IngestResult> {
  const summary: DispensaryIngestSummary = {
    dispensaryId: request.dispensaryId,
    syncedAt: request.syncedAt,
    received: request.skus.length,
    created: 0,
    updated: 0,
    delisted: 0,
    errors: [],
  };

  const existing = await storage.listActiveSkus(request.dispensaryId);
  const existingBySku = new Map(existing.map((r) => [r.sku, r]));
  const seenSkus = new Set<string>();

  for (const payload of request.skus) {
    const reason = validateSku(payload);
    if (reason) {
      summary.errors.push({ sku: payload.sku, reason });
      continue;
    }
    if (seenSkus.has(payload.sku)) {
      summary.errors.push({ sku: payload.sku, reason: "duplicate sku in payload" });
      continue;
    }
    seenSkus.add(payload.sku);

    const result = await storage.upsertSku({
      dispensaryId: request.dispensaryId,
      sku: payload.sku,
      upc: payload.upc,
      name: payload.name,
      brand: payload.brand,
      format: normalizeFormat(payload.format),
      strainType: normalizeStrainType(payload.strainType),
      thcMgPerUnit: payload.thcMgPerUnit,
      cbdMgPerUnit: payload.cbdMgPerUnit,
      thcPercent: payload.thcPercent,
      cbdPercent: payload.cbdPercent,
      packSize: payload.packSize,
      priceCents: payload.priceCents,
      inStock: payload.inStock,
      inventoryCount: payload.inventoryCount,
      imageUrl: payload.imageUrl,
      coaUrl: payload.coaUrl,
      description: payload.description,
    });

    if (result.created) summary.created += 1;
    else summary.updated += 1;
  }

  // Anything we had active that wasn't in the snapshot → delist.
  const delistIds: string[] = [];
  for (const row of existing) {
    if (!seenSkus.has(row.sku)) delistIds.push(row.id);
  }
  if (delistIds.length > 0) {
    await storage.delistSkus(delistIds);
    summary.delisted = delistIds.length;
  }

  await storage.markDispensarySynced(
    request.dispensaryId,
    new Date(request.syncedAt),
  );

  return { summary };
}
