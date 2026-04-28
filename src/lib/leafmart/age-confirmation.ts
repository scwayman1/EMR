"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Lightweight client-side age-of-purchase confirmation for regulated products.
 *
 * Storage: sessionStorage. The confirmation lasts the browser session and is
 * cleared when the tab/window closes — long enough to avoid re-prompting
 * during a single shopping flow, short enough that returning visitors are
 * asked again. We deliberately don't persist this to localStorage or cookies
 * so we never carry a "yes" answer past the device the user is on.
 *
 * This is not identity verification. It's a UX safeguard layered on top of
 * the server-side checkout API, which performs the binding check.
 */

export const AGE_CONFIRMED_KEY = "leafmart:age-confirmed-21:v1";
export const AGE_DENIED_KEY = "leafmart:age-denied:v1";
export const AGE_EVENT = "leafmart:age-confirmation-changed";

export type AgeStatus = "unknown" | "confirmed" | "denied";

function readStatus(): AgeStatus {
  if (typeof window === "undefined") return "unknown";
  try {
    if (sessionStorage.getItem(AGE_CONFIRMED_KEY) === "1") return "confirmed";
    if (sessionStorage.getItem(AGE_DENIED_KEY) === "1") return "denied";
  } catch {
    // sessionStorage disabled — treat every visit as unknown.
  }
  return "unknown";
}

function broadcast() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AGE_EVENT));
}

export function confirmAgeOver21() {
  try {
    sessionStorage.setItem(AGE_CONFIRMED_KEY, "1");
    sessionStorage.removeItem(AGE_DENIED_KEY);
  } catch {
    // ignore
  }
  broadcast();
}

export function denyAgeOver21() {
  try {
    sessionStorage.setItem(AGE_DENIED_KEY, "1");
    sessionStorage.removeItem(AGE_CONFIRMED_KEY);
  } catch {
    // ignore
  }
  broadcast();
}

export function resetAgeConfirmation() {
  try {
    sessionStorage.removeItem(AGE_CONFIRMED_KEY);
    sessionStorage.removeItem(AGE_DENIED_KEY);
  } catch {
    // ignore
  }
  broadcast();
}

/**
 * Reactive view of the current age-confirmation status. Returns `"unknown"`
 * during SSR and on the very first render, then settles to the stored value
 * after hydration. Mutations from anywhere in the app (this tab) propagate
 * via the `AGE_EVENT` custom event.
 */
export function useAgeConfirmation() {
  const [status, setStatus] = useState<AgeStatus>("unknown");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStatus(readStatus());
    setHydrated(true);

    const onChange = () => setStatus(readStatus());
    window.addEventListener(AGE_EVENT, onChange);
    // Catch tabs that mutate sessionStorage from another window (rare, but
    // sessionStorage propagates within the same origin tabs in some browsers).
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(AGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const confirm = useCallback(() => confirmAgeOver21(), []);
  const deny = useCallback(() => denyAgeOver21(), []);
  const reset = useCallback(() => resetAgeConfirmation(), []);

  return {
    status,
    hydrated,
    isConfirmed: status === "confirmed",
    isDenied: status === "denied",
    confirm,
    deny,
    reset,
  };
}
