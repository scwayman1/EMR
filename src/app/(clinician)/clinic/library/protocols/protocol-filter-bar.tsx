"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { CannabinoidProfile } from "@/lib/domain/cannabis-dosing-protocols";

/**
 * URL-driven filter bar for the protocols list. Updates the ?condition
 * and ?cannabinoid search params, which the server component reads.
 * Any filter can be reset by choosing the "All" option.
 */
export function ProtocolFilterBar({
  conditions,
  cannabinoids,
  activeCondition,
  activeCannabinoid,
  resultCount,
  totalCount,
}: {
  conditions: string[];
  cannabinoids: CannabinoidProfile[];
  activeCondition: string;
  activeCannabinoid: string;
  resultCount: number;
  totalCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `?${qs}` : "?", { scroll: false });
      });
    },
    [router, searchParams],
  );

  const hasFilter = Boolean(activeCondition || activeCannabinoid);

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-surface-raised border border-border print:hidden"
      data-pending={isPending || undefined}
    >
      <FilterField label="Condition">
        <select
          value={activeCondition}
          onChange={(e) => updateParam("condition", e.target.value)}
          className="w-full sm:w-56 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <option value="">All conditions</option>
          {conditions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Cannabinoid">
        <select
          value={activeCannabinoid}
          onChange={(e) => updateParam("cannabinoid", e.target.value)}
          className="w-full sm:w-40 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <option value="">Any</option>
          {cannabinoids.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FilterField>

      <div className="flex-1" />

      <div className="flex items-center gap-3 text-xs text-text-muted tabular-nums">
        <span>
          {resultCount} of {totalCount} protocol{totalCount === 1 ? "" : "s"}
        </span>
        {hasFilter && (
          <button
            type="button"
            onClick={() => {
              startTransition(() => {
                router.replace("?", { scroll: false });
              });
            }}
            className="text-accent hover:underline"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-text-subtle font-medium">
        {label}
      </span>
      {children}
    </label>
  );
}
