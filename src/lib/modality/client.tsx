/**
 * <ModalityGate /> — EMR-410
 *
 * Renders `children` only when the named modality is enabled for the current
 * practice; renders `fallback` (or null) otherwise.
 *
 * Two flavors live in this module:
 *
 * 1. `ModalityGate` (server) — the preferred form. Looks up the practice
 *    from the EMR-411 PracticeContext when that lands; until then, accepts
 *    `practiceId` as a prop. Hits Prisma via `isModalityEnabled()` which is
 *    per-request cached, so multiple gates in one render don't fan out.
 *
 * 2. `ClientModalityGate` (client) — same API but reads from a snapshot
 *    handed down from the server tree. Use this inside client components
 *    where awaiting a server fetch isn't possible. Wrap the subtree in
 *    `<ModalitySnapshotProvider snapshot={...} />` from a server component.
 *
 * Both flavors fail closed: missing practice id, missing snapshot, or
 * disabled modality all render `fallback` — never the children.
 */

"use client";

import { createContext, useContext, type ReactNode } from "react";

import {
  MODALITY_META,
  isModalityId,
  type ModalityId,
} from "@/lib/modality/registry";
import type { ModalitySnapshotDTO } from "@/lib/modality/server";

// ────────────────────────────────────────────────────────────────────────────
// Client-side context + hook
// ────────────────────────────────────────────────────────────────────────────

const ModalitySnapshotContext = createContext<ModalitySnapshotDTO | null>(null);

/**
 * Provide a server-fetched snapshot to a client subtree. Place at the top of
 * any client island that needs to consult the modality state — typically the
 * shell renderer (EMR-411).
 */
export function ModalitySnapshotProvider(props: {
  snapshot: ModalitySnapshotDTO | null;
  children: ReactNode;
}): JSX.Element {
  return (
    <ModalitySnapshotContext.Provider value={props.snapshot}>
      {props.children}
    </ModalitySnapshotContext.Provider>
  );
}

/**
 * Read the current modality snapshot in a client component. Returns `null`
 * when no snapshot is in scope — callers should treat that as fail-closed
 * (no modality is enabled).
 */
export function useModalityState(): ModalitySnapshotDTO | null {
  return useContext(ModalitySnapshotContext);
}

/**
 * Pure check against an in-hand snapshot. Mirrors `resolveModality` in
 * ./server.ts but operates over the DTO shape (arrays, not Sets).
 */
function resolveFromDTO(
  snapshot: ModalitySnapshotDTO | null,
  modality: ModalityId,
): boolean {
  if (!snapshot) return false;
  if (!snapshot.enabled.includes(modality)) return false;

  for (const dep of MODALITY_META[modality].requires) {
    if (snapshot.disabled.includes(dep)) return false;
    if (!snapshot.enabled.includes(dep)) return false;
  }
  return true;
}

/**
 * Hook form: ask whether a modality is enabled given the current snapshot.
 * Returns `false` when no provider is in scope.
 */
export function useIsModalityEnabled(modality: ModalityId): boolean {
  const snapshot = useModalityState();
  return resolveFromDTO(snapshot, modality);
}

// ────────────────────────────────────────────────────────────────────────────
// Gate components
// ────────────────────────────────────────────────────────────────────────────

export type ModalityGateProps = {
  /** Modality slug — must be a registered modality id. */
  modality: ModalityId;
  /**
   * Optional explicit practiceId. Required until EMR-411's PracticeContext
   * lands. When EMR-411 is wired, the server gate falls back to context.
   */
  practiceId?: string;
  /** Rendered when the modality is disabled. Defaults to `null`. */
  fallback?: ReactNode;
  children: ReactNode;
};

/**
 * Client-side gate. Reads from `useModalityState()`. Use inside client
 * components that already live under a `<ModalitySnapshotProvider />`.
 */
export function ClientModalityGate(props: ModalityGateProps): JSX.Element {
  const { modality, fallback = null, children } = props;
  const enabled = useIsModalityEnabled(modality);
  if (!isModalityId(modality)) return <>{fallback}</>;
  return <>{enabled ? children : fallback}</>;
}
