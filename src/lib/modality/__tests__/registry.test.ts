/**
 * Modality registry + isModalityEnabled tests — EMR-410
 *
 * Acceptance:
 *   1. Unpublished practice → all modalities resolve false.
 *   2. Pain Management published config → cannabis-medicine is false.
 *   3. Cannabis Medicine published config → cannabis-medicine is true.
 *   4. Disabling cannabis-medicine cascades to commerce-leafmart (off even
 *      when commerce is in enabledModalities).
 *
 * The Prisma client is mocked via `vi.mock` so these run pure-unit, no DB.
 */

import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";

import {
  applyTemplateDefaults,
} from "@/lib/specialty-templates/registry";

// `server-only` is a Next.js-runtime guard that throws when imported from a
// client module. Vitest doesn't run inside Next, so we stub it to a no-op for
// the duration of this file. Without this, every import of ./server.ts fails.
vi.mock("server-only", () => ({}));

// ────────────────────────────────────────────────────────────────────────────
// Prisma mock — replaces `@/lib/db/prisma` for the duration of this file.
// ────────────────────────────────────────────────────────────────────────────

type PublishedRow = {
  id: string;
  version: number;
  enabledModalities: string[];
  disabledModalities: string[];
} | null;

const findFirstMock = vi.fn<() => Promise<PublishedRow>>();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    practiceConfiguration: {
      findFirst: (..._args: unknown[]) => findFirstMock(),
    },
  },
}));

// React's `cache()` memoizes per call site for the lifetime of the module.
// Each test wants a fresh result, so we re-import the server module after
// resetting the mock to defeat the cache between cases.
async function loadServer() {
  vi.resetModules();
  return await import("@/lib/modality/server");
}

beforeEach(() => {
  findFirstMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ────────────────────────────────────────────────────────────────────────────
// Registry shape sanity
// ────────────────────────────────────────────────────────────────────────────

describe("modality registry shape", () => {
  it("MODALITY_META covers every REGISTERED_MODALITIES entry", async () => {
    const { MODALITY_META, listModalities } = await import(
      "@/lib/modality/registry"
    );
    const { REGISTERED_MODALITIES } = await import(
      "@/lib/specialty-templates/manifest-schema"
    );

    expect(Object.keys(MODALITY_META).sort()).toEqual(
      [...REGISTERED_MODALITIES].sort(),
    );
    // listModalities returns one meta per registered slug
    expect(listModalities()).toHaveLength(REGISTERED_MODALITIES.length);
  });

  it("commerce-leafmart requires cannabis-medicine (v1 dependency)", async () => {
    const { MODALITY_META } = await import("@/lib/modality/registry");
    expect(MODALITY_META["commerce-leafmart"].requires).toEqual([
      "cannabis-medicine",
    ]);
    // Inverse map populated.
    expect(MODALITY_META["cannabis-medicine"].dependents).toContain(
      "commerce-leafmart",
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// isModalityEnabled
// ────────────────────────────────────────────────────────────────────────────

describe("isModalityEnabled", () => {
  it("returns false for an unpublished practice (no config row)", async () => {
    findFirstMock.mockResolvedValue(null);
    const { isModalityEnabled } = await loadServer();

    expect(await isModalityEnabled("practice-empty", "cannabis-medicine")).toBe(
      false,
    );
    expect(await isModalityEnabled("practice-empty", "medications")).toBe(false);
  });

  it("returns false for cannabis-medicine on a Pain Management published config", async () => {
    // Use the canonical Pain Management seed so the test fails if the
    // manifest's bleed gate ever regresses.
    const seed = applyTemplateDefaults("pain-management-non-cannabis");
    findFirstMock.mockResolvedValue({
      id: "cfg-pain",
      version: 3,
      enabledModalities: seed.enabledModalities ?? [],
      disabledModalities: seed.disabledModalities ?? [],
    });

    const { isModalityEnabled } = await loadServer();
    expect(await isModalityEnabled("practice-pain", "cannabis-medicine")).toBe(
      false,
    );
    // Sanity: a modality that IS enabled in the seed reports true.
    expect(await isModalityEnabled("practice-pain", "procedures")).toBe(true);
  });

  it("returns true for cannabis-medicine on a Cannabis Medicine published config", async () => {
    const seed = applyTemplateDefaults("cannabis-medicine");
    findFirstMock.mockResolvedValue({
      id: "cfg-cb",
      version: 1,
      enabledModalities: seed.enabledModalities ?? [],
      disabledModalities: seed.disabledModalities ?? [],
    });

    const { isModalityEnabled } = await loadServer();
    expect(await isModalityEnabled("practice-cb", "cannabis-medicine")).toBe(
      true,
    );
    expect(await isModalityEnabled("practice-cb", "commerce-leafmart")).toBe(
      true,
    );
  });

  it("disabling cannabis-medicine cascades to commerce-leafmart", async () => {
    // commerce-leafmart is in enabledModalities, but cannabis-medicine is
    // explicitly disabled — the cascade must turn commerce off.
    findFirstMock.mockResolvedValue({
      id: "cfg-cascade",
      version: 1,
      enabledModalities: ["commerce-leafmart", "patient-reported-outcomes"],
      disabledModalities: ["cannabis-medicine"],
    });

    const { isModalityEnabled } = await loadServer();
    expect(await isModalityEnabled("practice-cascade", "commerce-leafmart")).toBe(
      false,
    );
    expect(
      await isModalityEnabled("practice-cascade", "cannabis-medicine"),
    ).toBe(false);
    // Independent modality still reports true.
    expect(
      await isModalityEnabled("practice-cascade", "patient-reported-outcomes"),
    ).toBe(true);
  });

  it("commerce-leafmart enabled without cannabis-medicine in either list still cascades off", async () => {
    // Belt-and-suspenders: even when cannabis-medicine is silently absent
    // (neither enabled nor explicitly disabled), the requires-edge fails.
    findFirstMock.mockResolvedValue({
      id: "cfg-missing",
      version: 1,
      enabledModalities: ["commerce-leafmart"],
      disabledModalities: [],
    });

    const { isModalityEnabled } = await loadServer();
    expect(await isModalityEnabled("practice-missing", "commerce-leafmart")).toBe(
      false,
    );
  });

  it("returns false when practiceId is empty", async () => {
    const { isModalityEnabled } = await loadServer();
    expect(await isModalityEnabled("", "medications")).toBe(false);
    // findFirst should not have been called for empty practiceId.
    expect(findFirstMock).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// requireModalityEnabled / withModalityErrors
// ────────────────────────────────────────────────────────────────────────────

describe("requireModalityEnabled", () => {
  it("throws MODALITY_DISABLED:<slug> when off", async () => {
    findFirstMock.mockResolvedValue(null);
    vi.resetModules();
    const { requireModalityEnabled } = await import(
      "@/lib/modality/api-guard"
    );

    await expect(
      requireModalityEnabled("practice-x", "cannabis-medicine"),
    ).rejects.toThrowError("MODALITY_DISABLED:cannabis-medicine");
  });

  it("resolves silently when on", async () => {
    findFirstMock.mockResolvedValue({
      id: "cfg-on",
      version: 1,
      enabledModalities: ["cannabis-medicine"],
      disabledModalities: [],
    });
    vi.resetModules();
    const { requireModalityEnabled } = await import(
      "@/lib/modality/api-guard"
    );

    await expect(
      requireModalityEnabled("practice-on", "cannabis-medicine"),
    ).resolves.toBeUndefined();
  });

  it("withModalityErrors translates MODALITY_DISABLED to 403 JSON", async () => {
    findFirstMock.mockResolvedValue(null);
    vi.resetModules();
    const { requireModalityEnabled, withModalityErrors } = await import(
      "@/lib/modality/api-guard"
    );

    const response = await withModalityErrors(async () => {
      await requireModalityEnabled("practice-y", "commerce-leafmart");
      return new Response("unreachable");
    });

    // Vitest doesn't fully mock NextResponse — we just assert it's a Response
    // with the expected status + body.
    expect((response as Response).status).toBe(403);
    const body = await (response as Response).json();
    expect(body).toEqual({
      error: "modality_disabled",
      modality: "commerce-leafmart",
    });
  });
});
