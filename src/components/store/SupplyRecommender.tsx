"use client";

// EMR-007 — AI-Powered Supply Store.
//
// The shopper tells us what they're managing (symptoms) and what they want
// to feel (goals); the recommender ranks the supply catalog to those
// inputs and explains WHY each product surfaced. Deterministic scoring
// stands in for the model so the experience is testable; swap `scoreFor`
// for a model call without touching the UI.

import * as React from "react";
import { Sparkles, Wand2 } from "lucide-react";
import type { MarketplaceProduct } from "@/lib/marketplace/types";
import { SYMPTOM_OPTIONS, GOAL_OPTIONS } from "@/lib/marketplace/types";
import { Eyebrow } from "@/components/ui/ornament";
import { Badge } from "@/components/ui/badge";
import { StoreProductCard } from "./StoreProductCard";
import { cn } from "@/lib/utils/cn";

interface Scored {
  product: MarketplaceProduct;
  score: number;
  reasons: string[];
}

function scoreFor(
  product: MarketplaceProduct,
  symptoms: string[],
  goals: string[],
): Scored {
  let score = 0;
  const reasons: string[] = [];

  for (const s of symptoms) {
    if (product.symptoms.includes(s)) {
      score += 3;
      reasons.push(`targets ${s.toLowerCase()}`);
    }
  }
  for (const g of goals) {
    if (product.goals.includes(g)) {
      score += 2;
      reasons.push(`supports ${g.toLowerCase()}`);
    }
  }
  if (product.clinicianPick) {
    score += 1.5;
    reasons.push("clinician pick");
  }
  if (product.beginnerFriendly && (symptoms.length > 0 || goals.length > 0)) {
    score += 0.5;
  }
  if (product.outcomePct) {
    score += product.outcomePct / 100;
    reasons.push(`${product.outcomePct}% reported improvement`);
  }
  score += (product.averageRating ?? 0) / 10;

  return { product, score, reasons: reasons.slice(0, 3) };
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "border-accent bg-accent text-accent-ink"
          : "border-border bg-surface text-text-muted hover:border-accent hover:text-text",
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export function SupplyRecommender({ products }: { products: MarketplaceProduct[] }) {
  const [symptoms, setSymptoms] = React.useState<string[]>([]);
  const [goals, setGoals] = React.useState<string[]>([]);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const hasInput = symptoms.length > 0 || goals.length > 0;

  const ranked = React.useMemo(() => {
    const scored = products.map((p) => scoreFor(p, symptoms, goals));
    if (!hasInput) {
      // Default view: clinician picks + top-rated.
      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
    }
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [products, symptoms, goals, hasInput]);

  return (
    <div>
      <div className="rounded-2xl border border-border bg-surface-raised p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Wand2 width={18} height={18} className="text-accent" />
          <Eyebrow>AI supply finder</Eyebrow>
        </div>
        <p className="mt-2 text-[13.5px] text-text-muted">
          Tell us what you&apos;re managing and how you want to feel. Our AI ranks the supply catalog
          to you and explains every recommendation.
        </p>

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
            What are you managing?
          </p>
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_OPTIONS.map((s) => (
              <Chip key={s} label={s} active={symptoms.includes(s)} onClick={() => toggle(symptoms, setSymptoms, s)} />
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
            What&apos;s your goal?
          </p>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((g) => (
              <Chip key={g} label={g} active={goals.includes(g)} onClick={() => toggle(goals, setGoals, g)} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Sparkles width={15} height={15} className="text-accent" />
        <p className="text-[13px] font-medium text-text">
          {hasInput ? `${ranked.length} AI-matched products` : "Top picks for you"}
        </p>
      </div>

      {ranked.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border-strong/60 p-6 text-center text-[13px] text-text-muted">
          No matches for that combination yet. Try fewer filters.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ranked.map(({ product, reasons }) => (
            <div key={product.slug}>
              <StoreProductCard product={product} />
              {reasons.length > 0 && (
                <p className="mt-1.5 flex flex-wrap items-center gap-1 px-1 text-[11.5px] text-text-subtle">
                  <Badge tone="accent">
                    <Sparkles width={10} height={10} /> Why
                  </Badge>
                  {reasons.join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
