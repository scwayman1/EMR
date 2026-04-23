"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/sparkline";
import { cn } from "@/lib/utils/cn";
import { EMOJI_OPTIONS } from "@/lib/domain/emoji-outcomes";

export interface EfficacyDataPoint {
  loggedAt: string;
  value: number; // 0-10 scale
}

export interface ProductEfficacy {
  regimenId: string;
  productId: string;
  productName: string;
  brand: string | null;
  route: string;
  doseAmount: number;
  doseUnit: string;
  startedAt: string;
  daysOnTreatment: number;
  avgRating: number | null;
  series: EfficacyDataPoint[];
}

interface Props {
  products: ProductEfficacy[];
}

/**
 * Map a 0-10 normalized value back to the 5-emoji rating scale we use
 * throughout post-dose check-ins.
 */
function emojiForValue(value: number) {
  // 1->terrible, 3->bad, 5->neutral, 7->good, 9->great
  if (value >= 8) return EMOJI_OPTIONS[4];
  if (value >= 6) return EMOJI_OPTIONS[3];
  if (value >= 4) return EMOJI_OPTIONS[2];
  if (value >= 2) return EMOJI_OPTIONS[1];
  return EMOJI_OPTIONS[0];
}

export function EfficacyDashboard({ products }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  if (products.length === 0) {
    return (
      <Card className="rounded-2xl text-center">
        <CardContent className="py-12">
          <p className="text-5xl mb-4">🌱</p>
          <p className="text-base font-medium text-text">
            No active regimens yet
          </p>
          <p className="text-sm text-text-muted mt-2 max-w-sm mx-auto">
            Once your provider sets up a dosing plan, your per-product efficacy
            will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const detail = selected
    ? products.find((p) => p.regimenId === selected) ?? null
    : null;

  return (
    <div className="space-y-5">
      {detail ? (
        <DetailView product={detail} onBack={() => setSelected(null)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {products.map((p) => (
            <ProductCard
              key={p.regimenId}
              product={p}
              onClick={() => setSelected(p.regimenId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  onClick,
}: {
  product: ProductEfficacy;
  onClick: () => void;
}) {
  const avgEmoji = product.avgRating !== null ? emojiForValue(product.avgRating) : null;
  const series = product.series.map((s) => s.value);

  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl bg-surface border border-border/80 shadow-sm p-6 hover:shadow-md hover:border-accent/40 transition-all active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="font-display text-lg text-text tracking-tight truncate">
            {product.productName}
          </p>
          {product.brand && (
            <p className="text-xs text-text-muted mt-0.5 truncate">{product.brand}</p>
          )}
          <p className="text-[11px] text-text-subtle mt-1">
            {product.route} &middot; {product.doseAmount} {product.doseUnit}
          </p>
        </div>
        {avgEmoji ? (
          <div
            className={cn(
              "flex flex-col items-center px-3 py-2 rounded-2xl border-2 shrink-0",
              avgEmoji.color
            )}
          >
            <span className="text-3xl leading-none">{avgEmoji.emoji}</span>
            <span className="text-[10px] mt-1 font-semibold tabular-nums">
              {(product.avgRating! / 2 + 0.5).toFixed(1)} / 5
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center px-3 py-2 rounded-2xl border-2 border-dashed border-border shrink-0">
            <span className="text-2xl leading-none">🤔</span>
            <span className="text-[10px] mt-1 font-medium text-text-subtle">
              No data
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[12px] text-text-muted mb-3">
        <span>
          <span className="font-semibold text-text">{product.daysOnTreatment}</span> days on treatment
        </span>
        <span>
          {product.series.length} check-in{product.series.length === 1 ? "" : "s"}
        </span>
      </div>

      {series.length >= 2 ? (
        <Sparkline data={series} width={320} height={40} className="w-full" />
      ) : (
        <p className="text-[11px] text-text-subtle text-center py-3">
          Log a few check-ins to see your trend
        </p>
      )}

      <p className="text-[11px] text-accent text-right mt-3">View history →</p>
    </button>
  );
}

function DetailView({
  product,
  onBack,
}: {
  product: ProductEfficacy;
  onBack: () => void;
}) {
  const max = 10;
  const sorted = useMemo(
    () =>
      [...product.series].sort(
        (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
      ),
    [product.series]
  );

  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-7 pb-7">
        <div className="flex items-center justify-between mb-5">
          <Button variant="ghost" onClick={onBack} className="rounded-xl">
            ← Back
          </Button>
          {product.avgRating !== null && (
            <Badge tone="accent">
              avg {(product.avgRating / 2 + 0.5).toFixed(1)} / 5
            </Badge>
          )}
        </div>

        <div className="text-center mb-6">
          <p className="font-display text-2xl text-text tracking-tight">
            {product.productName}
          </p>
          {product.brand && (
            <p className="text-sm text-text-muted mt-1">{product.brand}</p>
          )}
          <p className="text-xs text-text-subtle mt-2">
            {product.daysOnTreatment} days on treatment &middot;
            {" "}{product.series.length} check-in{product.series.length === 1 ? "" : "s"}
          </p>
        </div>

        {sorted.length === 0 ? (
          <p className="text-center text-sm text-text-muted py-12">
            No check-ins yet — log a dose to start tracking.
          </p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wider text-text-subtle font-semibold mb-2">
              Per-dose history
            </p>
            <div className="flex items-end gap-1 h-40 px-1">
              {sorted.map((point, i) => {
                const heightPct = (point.value / max) * 100;
                const emoji = emojiForValue(point.value);
                return (
                  <div
                    key={`${point.loggedAt}-${i}`}
                    className="flex-1 flex flex-col items-center justify-end gap-1 group"
                    title={`${new Date(point.loggedAt).toLocaleString()} — ${emoji.emoji} ${emoji.label}`}
                  >
                    <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                      {emoji.emoji}
                    </span>
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-accent/40 to-accent transition-all hover:from-accent/60 hover:to-accent-strong"
                      style={{ height: `${Math.max(8, heightPct)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-text-subtle pt-2">
              <span>{new Date(sorted[0].loggedAt).toLocaleDateString()}</span>
              <span>{new Date(sorted[sorted.length - 1].loggedAt).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
