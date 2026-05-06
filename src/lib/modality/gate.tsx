/**
 * <ModalityGate /> server component — EMR-410
 *
 * Async server component that resolves the modality snapshot via Prisma and
 * renders children only when enabled. Pair with `ClientModalityGate` (from
 * ./client.tsx) inside client subtrees.
 *
 * Until EMR-411's PracticeContext lands, callers must pass `practiceId`
 * explicitly. When neither context nor prop is available, the gate renders
 * `fallback` — fail closed by design.
 */

import "server-only";

import type { ReactNode } from "react";

import { isModalityEnabled } from "@/lib/modality/server";
import { isModalityId, type ModalityId } from "@/lib/modality/registry";

export type ModalityGateProps = {
  modality: ModalityId;
  /**
   * Required until EMR-411 lands a PracticeContext. Once the context exists,
   * this prop becomes optional and overrides the contextual value.
   */
  practiceId?: string;
  fallback?: ReactNode;
  children: ReactNode;
};

export async function ModalityGate(
  props: ModalityGateProps,
): Promise<JSX.Element> {
  const { modality, practiceId, fallback = null, children } = props;

  if (!isModalityId(modality)) return <>{fallback}</>;
  // TODO(EMR-411): replace with PracticeContext lookup once that lands.
  if (!practiceId) return <>{fallback}</>;

  const enabled = await isModalityEnabled(practiceId, modality);
  return <>{enabled ? children : fallback}</>;
}
