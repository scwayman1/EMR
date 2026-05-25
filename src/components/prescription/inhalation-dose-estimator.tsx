"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  estimateInhalationDose,
  isInhaledProductType,
  type InhalationProduct,
} from "@/lib/domain/inhalation-dose";

/**
 * Inhalation Dose Estimator (EMR-003)
 *
 * Patient-facing widget that lets a patient track puffs of an inhaled
 * cannabis product and shows the estimated mg of THC + CBD delivered.
 *
 *   estimatedMg = puffs × (mg/puff derived from product concentration)
 *
 * Designed to drop into the Quick Dose Logger and the Dosing View. The
 * component is self-contained: it owns the puff counter state and emits
 * the running estimate via `onChange` for forms that want to persist it.
 */

interface Props {
  product: InhalationProduct & { name?: string };
  initialPuffs?: number;
  onChange?: (estimate: {
    puffs: number;
    estimatedThcMg: number;
    estimatedCbdMg: number;
  }) => void;
  className?: string;
}

export function InhalationDoseEstimator({
  product,
  initialPuffs = 0,
  onChange,
  className,
}: Props) {
  const [puffs, setPuffs] = useState<number>(Math.max(0, initialPuffs | 0));

  const estimate = useMemo(
    () => estimateInhalationDose(puffs, product),
    [puffs, product],
  );

  function setAndEmit(next: number) {
    const clamped = Math.max(0, next | 0);
    setPuffs(clamped);
    onChange?.({
      puffs: clamped,
      estimatedThcMg: estimateInhalationDose(clamped, product).estimatedThcMg,
      estimatedCbdMg: estimateInhalationDose(clamped, product).estimatedCbdMg,
    });
  }

  if (!isInhaledProductType(product.productType)) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-5 space-y-4",
        className,
      )}
      data-testid="inhalation-dose-estimator"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
            Puff tracker
          </p>
          <p className="font-display text-lg text-text">
            {product.name ?? "Inhaled product"}
          </p>
        </div>
        <div className="text-right">
          <span className="block font-display text-3xl text-text tabular-nums leading-none">
            {puffs}
          </span>
          <span className="text-xs text-text-muted">
            puff{puffs === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Counter controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label="Remove one puff"
          onClick={() => setAndEmit(puffs - 1)}
          disabled={puffs === 0}
          className={cn(
            "h-12 w-12 rounded-full border text-2xl font-medium transition-all active:scale-95",
            puffs === 0
              ? "border-border bg-surface-muted text-text-subtle cursor-not-allowed"
              : "border-border bg-surface text-text hover:border-accent hover:text-accent",
          )}
        >
          –
        </button>
        <button
          type="button"
          aria-label="Add one puff"
          onClick={() => setAndEmit(puffs + 1)}
          className="h-14 w-14 rounded-full border-2 border-accent bg-accent text-white text-2xl font-semibold shadow-sm transition-all active:scale-95 hover:bg-accent/90"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setAndEmit(0)}
          className="px-4 h-12 rounded-full border border-border text-sm text-text-muted hover:border-accent hover:text-accent transition-all"
        >
          Reset
        </button>
      </div>

      {/* Estimate readout */}
      <div className="rounded-xl bg-accent-soft border border-accent/15 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent mb-2">
          Estimated mg delivered
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {estimate.estimatedThcMg > 0 && (
            <span className="inline-flex items-baseline gap-1">
              <span className="font-display text-2xl text-accent tabular-nums font-medium">
                {estimate.estimatedThcMg.toFixed(1)}
              </span>
              <span className="text-xs text-accent">mg THC</span>
            </span>
          )}
          {estimate.estimatedThcMg > 0 && estimate.estimatedCbdMg > 0 && (
            <span className="text-text-subtle">+</span>
          )}
          {estimate.estimatedCbdMg > 0 && (
            <span className="inline-flex items-baseline gap-1">
              <span className="font-display text-2xl text-[color:var(--highlight)] tabular-nums font-medium">
                {estimate.estimatedCbdMg.toFixed(1)}
              </span>
              <span className="text-xs text-[color:var(--highlight)]">
                mg CBD
              </span>
            </span>
          )}
          {estimate.estimatedThcMg === 0 && estimate.estimatedCbdMg === 0 && (
            <span className="text-sm text-text-muted">
              Tap “+” after each puff to estimate your dose.
            </span>
          )}
        </div>
        <p className="text-[11px] text-text-subtle mt-2 leading-relaxed">
          {estimate.rationale}
        </p>
      </div>
    </div>
  );
}
