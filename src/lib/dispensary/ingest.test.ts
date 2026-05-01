import { describe, it, expect } from "vitest";
import {
  ingestDispensaryCatalog,
  normalizeFormat,
  normalizeStrainType,
  validateSku,
  type ExistingSkuRow,
  type IngestStorage,
} from "./ingest";
import type { DispensaryIngestRequest, DispensarySkuPayload } from "./types";

function makeStorage(initial: ExistingSkuRow[]): {
  storage: IngestStorage;
  upserts: Array<{ sku: string; created: boolean }>;
  delisted: string[];
  syncedAt: Date | null;
} {
  const upserts: Array<{ sku: string; created: boolean }> = [];
  const delisted: string[] = [];
  let syncedAt: Date | null = null;
  const existing = [...initial];
  const storage: IngestStorage = {
    async listActiveSkus() {
      return existing;
    },
    async upsertSku(input) {
      const found = existing.find((e) => e.sku === input.sku);
      const created = !found;
      if (created) existing.push({ id: `new-${input.sku}`, sku: input.sku, active: true });
      upserts.push({ sku: input.sku, created });
      return { created };
    },
    async delistSkus(ids) {
      for (const id of ids) delisted.push(id);
    },
    async markDispensarySynced(_id, at) {
      syncedAt = at;
    },
  };
  return {
    storage,
    upserts,
    delisted,
    get syncedAt() {
      return syncedAt;
    },
  } as never;
}

const samplePayload = (overrides: Partial<DispensarySkuPayload> = {}): DispensarySkuPayload => ({
  sku: "sku-1",
  name: "Sleep Tincture 30mL",
  format: "tincture",
  thcMgPerUnit: 5,
  priceCents: 4500,
  inStock: true,
  ...overrides,
});

describe("validateSku", () => {
  it("accepts a valid payload", () => {
    expect(validateSku(samplePayload())).toBeNull();
  });

  it("rejects empty sku", () => {
    expect(validateSku(samplePayload({ sku: "" }))).toMatch(/sku required/);
  });

  it("rejects empty name", () => {
    expect(validateSku(samplePayload({ name: "" }))).toMatch(/name required/);
  });

  it("rejects negative price", () => {
    expect(validateSku(samplePayload({ priceCents: -10 }))).toMatch(/non-negative/);
  });

  it("rejects floating-cent prices (likely dollars)", () => {
    expect(validateSku(samplePayload({ priceCents: 9.99 }))).toMatch(/integer/);
  });

  it("rejects implausibly high prices (likely dollars)", () => {
    expect(validateSku(samplePayload({ priceCents: 50_000_000 }))).toMatch(/exceeds/);
  });

  it("rejects out-of-range thcPercent", () => {
    expect(validateSku(samplePayload({ thcPercent: 250 }))).toMatch(/thcPercent/);
  });
});

describe("normalizeFormat", () => {
  it("passes through canonical values", () => {
    expect(normalizeFormat("flower")).toBe("flower");
    expect(normalizeFormat("VAPE")).toBe("vape");
  });

  it("maps common aliases", () => {
    expect(normalizeFormat("Pre-Roll")).toBe("preroll");
    expect(normalizeFormat("cartridge")).toBe("vape");
    expect(normalizeFormat("gummy")).toBe("edible");
    expect(normalizeFormat("rosin")).toBe("concentrate");
  });

  it("falls back to 'other' for unknown formats", () => {
    expect(normalizeFormat("alien_format")).toBe("other");
  });
});

describe("normalizeStrainType", () => {
  it("normalizes case", () => {
    expect(normalizeStrainType("INDICA")).toBe("indica");
    expect(normalizeStrainType("Hybrid")).toBe("hybrid");
  });

  it("returns 'na' for missing or unknown", () => {
    expect(normalizeStrainType(undefined)).toBe("na");
    expect(normalizeStrainType("n/a")).toBe("na");
    expect(normalizeStrainType("indeterminate")).toBe("na");
  });
});

describe("ingestDispensaryCatalog", () => {
  const baseRequest = (skus: DispensarySkuPayload[]): DispensaryIngestRequest => ({
    dispensaryId: "disp-1",
    syncedAt: new Date("2026-04-29T12:00:00Z").toISOString(),
    skus,
  });

  it("creates new SKUs and reports counts", async () => {
    const t = makeStorage([]);
    const { summary } = await ingestDispensaryCatalog(
      t.storage,
      baseRequest([
        samplePayload({ sku: "a", name: "A" }),
        samplePayload({ sku: "b", name: "B" }),
      ]),
    );
    expect(summary.received).toBe(2);
    expect(summary.created).toBe(2);
    expect(summary.updated).toBe(0);
    expect(summary.delisted).toBe(0);
    expect(summary.errors).toEqual([]);
  });

  it("updates existing SKUs and delists missing ones", async () => {
    const t = makeStorage([
      { id: "id-a", sku: "a", active: true },
      { id: "id-b", sku: "b", active: true },
      { id: "id-c", sku: "c", active: true },
    ]);
    const { summary } = await ingestDispensaryCatalog(
      t.storage,
      baseRequest([
        samplePayload({ sku: "a", name: "A v2" }),
        samplePayload({ sku: "d", name: "D new" }),
      ]),
    );
    expect(summary.received).toBe(2);
    expect(summary.created).toBe(1); // only "d"
    expect(summary.updated).toBe(1); // "a"
    expect(summary.delisted).toBe(2); // b, c
    expect(t.delisted.sort()).toEqual(["id-b", "id-c"]);
  });

  it("rejects invalid rows but keeps processing", async () => {
    const t = makeStorage([]);
    const { summary } = await ingestDispensaryCatalog(
      t.storage,
      baseRequest([
        samplePayload({ sku: "good", name: "Good" }),
        samplePayload({ sku: "", name: "Bad" }),
        samplePayload({ sku: "good", name: "Dup" }),
      ]),
    );
    expect(summary.created).toBe(1);
    expect(summary.errors.length).toBe(2);
    expect(summary.errors[0].reason).toMatch(/sku required/);
    expect(summary.errors[1].reason).toMatch(/duplicate/);
  });

  it("records sync timestamp", async () => {
    const t = makeStorage([]);
    await ingestDispensaryCatalog(
      t.storage,
      baseRequest([samplePayload({ sku: "a" })]),
    );
    expect(t.syncedAt).toEqual(new Date("2026-04-29T12:00:00Z"));
  });
});
