"use client";

// EMR-646 — React hook for the universal patient search.
//
// Debounces the input query, hits `GET /api/patients/search?q=...`, and
// exposes loading / error / results state. Designed to be used by any
// clinician-facing surface that needs a patient lookup (sidebar search,
// chart picker, appointment scheduling, etc.).
//
// Usage:
//   const { results, isLoading, error } = usePatientSearch(query);
//
// The hook is intentionally minimal — no SWR/React-Query dependency,
// no cache. Patient searches are short-lived inputs typed in a search
// box; the API route is cheap, and adding a cache layer here would
// just create staleness bugs on a surface where freshness matters.

import { useEffect, useRef, useState } from "react";
import type { PatientSearchResult } from "./index";

export interface UsePatientSearchOptions {
  /** Debounce delay in ms. Defaults to 200ms. */
  debounceMs?: number;
  /** Max results. Server clamps to PATIENT_SEARCH_MAX_LIMIT. */
  limit?: number;
  /** Minimum query length before a request fires. Defaults to 2. */
  minLength?: number;
}

export interface UsePatientSearchState {
  results: PatientSearchResult[];
  isLoading: boolean;
  error: string | null;
}

export function usePatientSearch(
  query: string,
  options: UsePatientSearchOptions = {},
): UsePatientSearchState {
  const { debounceMs = 200, limit, minLength = 2 } = options;
  const [state, setState] = useState<UsePatientSearchState>({
    results: [],
    isLoading: false,
    error: null,
  });

  // Track the latest request so a slow earlier response doesn't
  // clobber the fresh state from a faster later one (last-write-wins
  // is wrong here — last-keystroke-wins is what the user expects).
  const reqIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    // Below the threshold → clear results and bail. We do NOT show an
    // error here; "type more" is a normal state, not a failure.
    if (trimmed.length < minLength) {
      // Abort any in-flight request so we don't paint stale rows.
      abortRef.current?.abort();
      setState({ results: [], isLoading: false, error: null });
      return;
    }

    const handle = setTimeout(() => {
      const reqId = ++reqIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const params = new URLSearchParams({ q: trimmed });
      if (limit !== undefined) params.set("limit", String(limit));

      fetch(`/api/patients/search?${params.toString()}`, {
        signal: controller.signal,
        // Search results MUST NOT be cached — every keystroke needs a
        // fresh server response or the UI lies about who matched.
        cache: "no-store",
      })
        .then(async (res) => {
          if (!res.ok) {
            const body = await safeJson(res);
            const message =
              (body as { message?: string } | null)?.message ??
              `Search failed (${res.status})`;
            throw new Error(message);
          }
          return (await res.json()) as { results: PatientSearchResult[] };
        })
        .then((body) => {
          // Stale-response guard: only commit if this is still the
          // freshest request.
          if (reqId !== reqIdRef.current) return;
          setState({
            results: body.results ?? [],
            isLoading: false,
            error: null,
          });
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") {
            // Expected — a newer keystroke superseded us.
            return;
          }
          if (reqId !== reqIdRef.current) return;
          setState({
            results: [],
            isLoading: false,
            error: err instanceof Error ? err.message : "Search failed",
          });
        });
    }, debounceMs);

    return () => {
      clearTimeout(handle);
    };
  }, [query, debounceMs, limit, minLength]);

  // Abort any in-flight request when the hook unmounts.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return state;
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
