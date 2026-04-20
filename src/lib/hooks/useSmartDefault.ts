"use client";

/**
 * useSmartDefault — React hook that binds a field to its last-used
 * value, persisted per-user + per-form via the smart-defaults storage
 * layer (see src/lib/domain/smart-defaults.ts).
 *
 * Contract:
 *   const [value, setValue, { prefilled, clear }] = useSmartDefault(
 *     userId,
 *     "dose-log",
 *     "product",
 *     ""
 *   );
 *
 * - SSR-safe: localStorage is only touched inside useEffect, so the
 *   initial render on the server (and the first client render) always
 *   uses `fallback`. Once the hook mounts, it hydrates to the stored
 *   value and flips `prefilled` to true on the next commit.
 * - Writes are debounced 300ms so typing into an input doesn't hammer
 *   localStorage on every keystroke. The final value is always flushed
 *   on unmount.
 * - `prefilled` is true only while the value still matches what we
 *   rehydrated from storage — the moment the user edits the field, it
 *   flips back to false so UI hints can fade out.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  forgetValue,
  readLastParsed,
  rememberValue,
} from "@/lib/domain/smart-defaults";

export interface SmartDefaultMeta {
  /** True when the current value was hydrated from storage and the user hasn't edited since. */
  prefilled: boolean;
  /** Wipe the remembered value for this field (and reset to fallback). */
  clear: () => void;
}

export type SmartDefaultSetter<T> = (next: T | ((prev: T) => T)) => void;

export const SMART_DEFAULT_DEBOUNCE_MS = 300;

export function useSmartDefault<T>(
  userId: string | null | undefined,
  formId: string,
  fieldId: string,
  fallback: T,
): readonly [T, SmartDefaultSetter<T>, SmartDefaultMeta] {
  const [value, setValueState] = useState<T>(fallback);
  const [prefilled, setPrefilled] = useState(false);

  // Track the latest value in a ref so the debounced flusher + unmount
  // cleanup can persist the final value without re-creating timers.
  const latestRef = useRef<T>(fallback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);

  // Hydrate once on mount (client only — useEffect doesn't run on the server).
  useEffect(() => {
    if (!userId) return;
    const stored = readLastParsed<T | undefined>(
      userId,
      formId,
      fieldId,
      undefined,
    );
    if (stored !== undefined) {
      latestRef.current = stored;
      setValueState(stored);
      setPrefilled(true);
    }
    hydratedRef.current = true;
    // Intentionally only run on mount / when the identity tuple changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, formId, fieldId]);

  // Flush any pending debounced write on unmount so we don't lose the
  // final value just because the user navigated away quickly.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        if (userId && hydratedRef.current) {
          rememberValue(userId, formId, fieldId, latestRef.current);
        }
      }
    };
  }, [userId, formId, fieldId]);

  const setValue = useCallback<SmartDefaultSetter<T>>(
    (next) => {
      setValueState((prev) => {
        const resolved =
          typeof next === "function"
            ? (next as (p: T) => T)(prev)
            : next;
        latestRef.current = resolved;

        // User-initiated change — drop the prefilled hint immediately.
        setPrefilled(false);

        if (userId) {
          if (timerRef.current !== null) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            rememberValue(userId, formId, fieldId, latestRef.current);
          }, SMART_DEFAULT_DEBOUNCE_MS);
        }

        return resolved;
      });
    },
    [userId, formId, fieldId],
  );

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (userId) forgetValue(userId, formId, fieldId);
    latestRef.current = fallback;
    setValueState(fallback);
    setPrefilled(false);
  }, [userId, formId, fieldId, fallback]);

  return [value, setValue, { prefilled, clear }] as const;
}
