"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  EMOJI_OPTIONS,
  OUTCOME_SCALES,
  SIDE_EFFECT_OPTIONS,
  getRandomPrompt,
  type EmojiRating,
  type QuickDoseLog,
} from "@/lib/domain/emoji-outcomes";

/* ── Types ──────────────────────────────────────────────── */

interface ProductInfo {
  id: string;
  regimenId: string;
  name: string;
  brand: string | null;
  productType: string;
  route: string;
  doseAmount: number;
  doseUnit: string;
  thcMg: number | null;
  cbdMg: number | null;
}

interface Props {
  patientId: string;
  products: ProductInfo[];
}

type Step = "product" | "emoji" | "scales" | "effects" | "done";

/* ── Component ──────────────────────────────────────────── */

export function QuickDoseLogger({ patientId, products }: Props) {
  const [step, setStep] = useState<Step>("product");
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);
  const [emoji, setEmoji] = useState<EmojiRating | null>(null);
  const [scales, setScales] = useState<Record<string, number>>({});
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
  const [prompt] = useState(getRandomPrompt);

  // Only show the 3 most relevant scales based on product type
  const relevantScales = OUTCOME_SCALES.slice(0, 3);

  function reset() {
    setStep("product");
    setSelectedProduct(null);
    setEmoji(null);
    setScales({});
    setSelectedEffects([]);
  }

  /* ── Step 1: Pick product ─────────────────────────────── */
  if (step === "product") {
    if (products.length === 0) {
      return (
        <Card className="rounded-2xl text-center py-12">
          <CardContent>
            <p className="text-4xl mb-4">💊</p>
            <p className="text-lg font-medium text-text">No active prescriptions</p>
            <p className="text-sm text-text-muted mt-2">
              Once your provider prescribes a cannabis product, you can log doses here.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        <p className="text-center text-sm text-text-muted mb-4">
          What did you just take?
        </p>
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setSelectedProduct(p);
              setStep("emoji");
            }}
            className="w-full text-left rounded-2xl border border-border bg-white p-5 hover:border-accent hover:shadow-sm transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-text">{p.name}</p>
                <p className="text-sm text-text-muted mt-0.5">
                  {p.brand} &middot; {p.route} &middot; {p.doseAmount} {p.doseUnit}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {p.thcMg && p.thcMg > 0 && (
                  <Badge tone="warning" className="text-[10px]">THC {p.thcMg.toFixed(0)}mg</Badge>
                )}
                {p.cbdMg && p.cbdMg > 0 && (
                  <Badge tone="success" className="text-[10px]">CBD {p.cbdMg.toFixed(0)}mg</Badge>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  }

  /* ── Step 2: Emoji rating ─────────────────────────────── */
  if (step === "emoji") {
    return (
      <Card className="rounded-2xl">
        <CardContent className="pt-8 pb-8">
          <p className="text-center text-lg font-medium text-text mb-2">{prompt}</p>
          <p className="text-center text-sm text-text-muted mb-8">
            {selectedProduct?.name} &middot; {selectedProduct?.doseAmount} {selectedProduct?.doseUnit}
          </p>

          {/* Emoji row */}
          <div className="flex justify-center gap-3 mb-8">
            {EMOJI_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setEmoji(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95",
                  emoji === opt.value
                    ? `${opt.color} border-current shadow-sm scale-105`
                    : "border-transparent hover:border-border hover:bg-surface-muted"
                )}
              >
                <span className="text-4xl">{opt.emoji}</span>
                <span className="text-[11px] font-medium">{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => setStep("scales")}
              disabled={!emoji}
              className="rounded-xl px-8"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ── Step 3: Quick scales ─────────────────────────────── */
  if (step === "scales") {
    return (
      <Card className="rounded-2xl">
        <CardContent className="pt-8 pb-8">
          <p className="text-center text-lg font-medium text-text mb-2">
            Quick ratings
          </p>
          <p className="text-center text-sm text-text-muted mb-8">
            Slide to rate (optional — skip any)
          </p>

          <div className="space-y-8">
            {relevantScales.map((scale) => (
              <div key={scale.metric}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text">
                    {scale.lowEmoji} {scale.label}
                  </span>
                  <span className="text-lg font-semibold text-accent tabular-nums">
                    {scales[scale.metric] ?? "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-text-subtle w-16 text-right shrink-0">{scale.lowLabel}</span>
                  <div className="flex-1 flex gap-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        onClick={() => setScales((prev) => ({ ...prev, [scale.metric]: n }))}
                        className={cn(
                          "flex-1 h-10 rounded-lg text-sm font-medium transition-all active:scale-90",
                          scales[scale.metric] === n
                            ? "bg-accent text-white shadow-sm"
                            : scales[scale.metric] && n <= scales[scale.metric]
                              ? "bg-accent/20 text-accent"
                              : "bg-surface-muted text-text-muted hover:bg-border"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-text-subtle w-16 shrink-0">{scale.highLabel}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3 mt-8">
            <Button variant="ghost" onClick={() => setStep("emoji")} className="rounded-xl">
              Back
            </Button>
            <Button onClick={() => setStep("effects")} className="rounded-xl px-8">
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ── Step 4: Side effects ─────────────────────────────── */
  if (step === "effects") {
    return (
      <Card className="rounded-2xl">
        <CardContent className="pt-8 pb-8">
          <p className="text-center text-lg font-medium text-text mb-2">
            Any side effects?
          </p>
          <p className="text-center text-sm text-text-muted mb-6">
            Tap all that apply (optional)
          </p>

          <div className="grid grid-cols-3 gap-2">
            {SIDE_EFFECT_OPTIONS.map((eff) => (
              <button
                key={eff.id}
                onClick={() => {
                  setSelectedEffects((prev) =>
                    prev.includes(eff.id)
                      ? prev.filter((e) => e !== eff.id)
                      : [...prev, eff.id]
                  );
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all active:scale-95",
                  selectedEffects.includes(eff.id)
                    ? "border-accent bg-accent-soft"
                    : "border-transparent bg-surface-muted hover:border-border"
                )}
              >
                <span className="text-2xl">{eff.emoji}</span>
                <span className="text-[11px] font-medium text-text leading-tight text-center">
                  {eff.label}
                </span>
              </button>
            ))}
          </div>

          <div className="flex justify-center gap-3 mt-8">
            <Button variant="ghost" onClick={() => setStep("scales")} className="rounded-xl">
              Back
            </Button>
            <Button
              onClick={() => setStep("done")}
              className="rounded-xl px-8"
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ── Step 5: Done ─────────────────────────────────────── */
  if (step === "done") {
    const emojiOpt = EMOJI_OPTIONS.find((e) => e.value === emoji);
    return (
      <Card className="rounded-2xl">
        <CardContent className="pt-10 pb-10 text-center">
          <span className="text-6xl block mb-4">🎉</span>
          <h2 className="font-display text-2xl text-text tracking-tight mb-2">
            Logged!
          </h2>
          <p className="text-sm text-text-muted mb-6">
            {selectedProduct?.name} &middot; {emojiOpt?.emoji} {emojiOpt?.label}
            {Object.keys(scales).length > 0 && (
              <> &middot; {Object.keys(scales).length} ratings</>
            )}
            {selectedEffects.length > 0 && selectedEffects[0] !== "none" && (
              <> &middot; {selectedEffects.length} side effect{selectedEffects.length !== 1 ? "s" : ""}</>
            )}
          </p>

          <div className="flex flex-col items-center gap-3">
            <Button onClick={reset} className="rounded-xl px-8">
              Log another dose
            </Button>
            <a href="/portal" className="text-sm text-accent hover:underline">
              Back to dashboard
            </a>
          </div>

          <p className="text-[11px] text-text-subtle mt-8">
            Your data is encrypted and HIPAA-protected. It helps your care team
            find the best treatment for you, and contributes to cannabis research.
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
