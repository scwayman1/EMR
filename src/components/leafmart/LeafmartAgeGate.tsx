"use client";

import { useCallback } from "react";
import { AgeGateModal } from "@/components/leafmart/AgeGateModal";
import { useAgeConfirmation } from "@/lib/leafmart/age-confirmation";

/**
 * Site-wide age gate for the Leafmart storefront. Mounted once in the
 * leafmart route-group layout so it fires on first entry to any page,
 * not only at cart/checkout. Persists for the browser session via the
 * existing `useAgeConfirmation` hook (sessionStorage).
 *
 * Closing without a choice is intentionally a no-op — this is a compliance
 * gate, not a casual prompt. A confirmed status unmounts the modal; a
 * denied status keeps the polite blocked view visible.
 */
export function LeafmartAgeGate() {
  const { status, hydrated } = useAgeConfirmation();
  const noop = useCallback(() => {}, []);

  if (!hydrated) return null;
  if (status === "confirmed") return null;

  return <AgeGateModal open onClose={noop} />;
}
