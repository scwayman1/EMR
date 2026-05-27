/**
 * Modality Server Helpers — EMR-410
 *
 * Server-only API for asking "is this modality enabled for this practice?"
 *
 * Architecture invariants:
 *   - Reads the practice's *latest published* PracticeConfiguration directly
 *     via Prisma. We do NOT route through `/api/configs/by-practice` — that
 *     route is for clients; calling it from server code would round-trip
 *     through the network and bypass the per-request cache.
 *   - Cached with React's `cache()` per request so repeated checks within a
 *     single render pass hit the DB once.
 *   - Returns `false` (fail-closed) when no published config exists yet — a
 *     practice that hasn't published cannot have any modality enabled.
 *   - `requires` cascades: if `commerce-leafmart` requires `cannabis-medicine`
 *     and `cannabis-medicine` is disabled, then `commerce-leafmart` is
 *     reported disabled even if it appears in `enabledModalities`.
 *   - NEVER branches on a specific slug. Cannabis-bleed prevention is enforced
 *     by the manifest + modality data, not by code paths.
 */

import "server-only";

import * as React from "react";

import { prisma } from "@/lib/db/prisma";
import {
  MODALITY_META,
  isModalityId,
  type ModalityId,
} from "@/lib/modality/registry";

// React's `cache()` is only present in the React Server Components build
// (Next provides it; the bare `react` package on npm 18.3.1 does not export
// it). Fall back to identity when it's missing so this module can be
// exercised in plain Node tests; under Next the per-request dedupe still
// kicks in because `React.cache` is the canary export that Next ships.
type CacheFn = <A extends unknown[], R>(
  fn: (...args: A) => R,
) => (...args: A) => R;
const reactCache: CacheFn =
  (React as unknown as { cache?: CacheFn }).cache ??
  (((fn) => fn) as CacheFn);

/**
 * Snapshot of what's enabled / disabled for a practice. Computed from the
 * latest published PracticeConfiguration. `null` when no published config
 * exists.
 */
export type ModalitySnapshot = {
  practiceId: string;
  configurationId: string;
  version: number;
  enabled: ReadonlySet<ModalityId>;
  disabled: ReadonlySet<ModalityId>;
};

/**
 * Per-request cached fetch of the latest published config. Returns the bare
 * row so callers can read both `enabledModalities` and `disabledModalities`.
 */
const getLatestPublishedRow = reactCache(async (practiceId: string) => {
  if (!practiceId) return null;
  return prisma.practiceConfiguration.findFirst({
    where: { practiceId, status: "published" },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      version: true,
      enabledModalities: true,
      disabledModalities: true,
    },
  });
});

/**
 * Per-request cached snapshot. Filters the persisted slug arrays to known
 * modalities — an unknown string in the DB (e.g. a removed modality) is
 * silently dropped. This keeps the system forward-compatible across modality
 * deprecations.
 */
export const getModalitySnapshot = reactCache(
  async (practiceId: string): Promise<ModalitySnapshot | null> => {
    const row = await getLatestPublishedRow(practiceId);
    if (!row) return null;

    const enabled = new Set<ModalityId>();
    for (const slug of row.enabledModalities) {
      if (isModalityId(slug)) enabled.add(slug);
    }
    const disabled = new Set<ModalityId>();
    for (const slug of row.disabledModalities) {
      if (isModalityId(slug)) disabled.add(slug);
    }

    return {
      practiceId,
      configurationId: row.id,
      version: row.version,
      enabled,
      disabled,
    };
  },
);

/**
 * Resolve effective enablement for a modality given an in-memory snapshot.
 * Pure — no I/O. Used by the client gate too (see ./client.tsx).
 */
export function resolveModality(
  snapshot: ModalitySnapshot | null,
  modality: ModalityId,
): boolean {
  if (!snapshot) return false;
  if (!snapshot.enabled.has(modality)) return false;

  // Cascade: any required modality being disabled (or not enabled) cascades
  // into this one being effectively off, regardless of what
  // `enabledModalities` says.
  for (const dep of MODALITY_META[modality].requires) {
    if (snapshot.disabled.has(dep)) return false;
    if (!snapshot.enabled.has(dep)) return false;
  }

  return true;
}

/**
 * `true` only when the modality is in `enabledModalities` AND none of its
 * `requires` are disabled. Returns `false` for an unpublished practice or
 * when `practiceId` is empty.
 */
export async function isModalityEnabled(
  practiceId: string,
  modality: ModalityId,
): Promise<boolean> {
  const snapshot = await getModalitySnapshot(practiceId);
  return resolveModality(snapshot, modality);
}

/**
 * Snapshot projection suitable for handing to client components — plain
 * arrays instead of Sets so it serializes cleanly across the
 * server/client boundary. Pair with `useModalityState()` from ./client.tsx.
 */
export type ModalitySnapshotDTO = {
  practiceId: string;
  configurationId: string;
  version: number;
  enabled: ModalityId[];
  disabled: ModalityId[];
};

export async function getModalitySnapshotDTO(
  practiceId: string,
): Promise<ModalitySnapshotDTO | null> {
  const snap = await getModalitySnapshot(practiceId);
  if (!snap) return null;
  return {
    practiceId: snap.practiceId,
    configurationId: snap.configurationId,
    version: snap.version,
    enabled: [...snap.enabled].sort(),
    disabled: [...snap.disabled].sort(),
  };
}
