"use client";

import { useState } from "react";
import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";
import {
  LIFESTYLE_DOMAINS,
  LIFESTYLE_TIPS,
  type LifestyleDomain,
  type LifestyleTip,
} from "@/lib/domain/lifestyle";

/* ---------- Difficulty badge tone mapping ---------- */

const DIFFICULTY_TONE: Record<
  LifestyleTip["difficulty"],
  "success" | "warning" | "danger"
> = {
  easy: "success",
  moderate: "warning",
  challenging: "danger",
};

const DIFFICULTY_LABEL: Record<LifestyleTip["difficulty"], string> = {
  easy: "Easy",
  moderate: "Moderate",
  challenging: "Challenging",
};

/* ---------- Expandable tip row ---------- */

function TipRow({ tip }: { tip: LifestyleTip }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left group"
    >
      <div className="flex items-start gap-3 py-3.5 px-1">
        {/* Expand / collapse chevron */}
        <span
          className="mt-0.5 shrink-0 text-text-subtle transition-transform duration-200"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <div className="flex-1 min-w-0">
          {/* Title + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-text group-hover:text-accent transition-colors">
              {tip.title}
            </span>
            <Badge tone={DIFFICULTY_TONE[tip.difficulty]} className="shrink-0">
              {DIFFICULTY_LABEL[tip.difficulty]}
            </Badge>
            {tip.timeCommitment !== "0 min" && (
              <span className="text-[11px] text-text-subtle">
                {tip.timeCommitment}
              </span>
            )}
          </div>

          {/* Expanded body */}
          <div
            className="overflow-hidden transition-all duration-300 ease-out"
            style={{
              maxHeight: open ? "200px" : "0px",
              opacity: open ? 1 : 0,
            }}
          >
            <p className="text-sm text-text-muted leading-relaxed mt-2 pr-4">
              {tip.body}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ---------- Domain card ---------- */

function DomainCard({ domain }: { domain: LifestyleDomain }) {
  const tips = LIFESTYLE_TIPS[domain.id] ?? [];

  return (
    <Card
      tone="raised"
      className="overflow-hidden card-hover"
      style={
        {
          borderLeftWidth: "4px",
          borderLeftColor: domain.color,
          "--domain-color": domain.color,
        } as React.CSSProperties
      }
    >
      {/* Domain header */}
      <div className="px-6 pt-5 pb-2">
        <div className="flex items-center gap-3">
          <span
            className="flex items-center justify-center w-10 h-10 rounded-xl text-xl"
            style={{
              backgroundColor: `color-mix(in srgb, ${domain.color} 12%, transparent)`,
            }}
            role="img"
            aria-label={domain.label}
          >
            {domain.icon}
          </span>
          <div>
            <h3 className="font-display text-lg font-medium text-text tracking-tight">
              {domain.label}
            </h3>
            <p className="text-xs text-text-subtle mt-0.5">
              {domain.description}
            </p>
          </div>
        </div>
      </div>

      {/* Tips list */}
      <CardContent className="pt-1 pb-4">
        <div className="divide-y divide-border/50">
          {tips.map((tip) => (
            <TipRow key={tip.title} tip={tip} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Domain icon pill (hero toolbar) ---------- */

function DomainPill({
  domain,
  active,
  onClick,
}: {
  domain: LifestyleDomain;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl transition-all duration-200 " +
        (active
          ? "bg-accent-soft ring-2 ring-accent/30 scale-105 shadow-sm"
          : "hover:bg-surface-muted")
      }
    >
      <span
        className="flex items-center justify-center w-11 h-11 rounded-full text-xl transition-transform duration-200"
        style={{
          backgroundColor: active
            ? `color-mix(in srgb, ${domain.color} 18%, transparent)`
            : `color-mix(in srgb, ${domain.color} 8%, transparent)`,
        }}
        role="img"
        aria-label={domain.label}
      >
        {domain.icon}
      </span>
      <span
        className={
          "text-[11px] font-medium tracking-wide " +
          (active ? "text-accent" : "text-text-subtle")
        }
      >
        {domain.label}
      </span>
    </button>
  );
}

/* ========== MAIN PAGE ========== */

export default function LifestylePage() {
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  const displayedDomains = activeDomain
    ? LIFESTYLE_DOMAINS.filter((d) => d.id === activeDomain)
    : LIFESTYLE_DOMAINS;

  return (
    <PageShell maxWidth="max-w-[960px]">
      {/* ==================== Hero ==================== */}
      <Card tone="ambient" className="mb-10 grain">
        <div className="relative z-10 px-6 md:px-10 py-10 md:py-14">
          <Eyebrow className="mb-4">Lifestyle plan</Eyebrow>
          <h1 className="font-display text-3xl md:text-[2.75rem] text-text tracking-tight leading-[1.08]">
            Your Lifestyle Plan
          </h1>
          <p className="text-[15px] md:text-base text-text-muted mt-4 leading-relaxed max-w-xl">
            Small changes, practiced consistently, become the foundation of how
            you feel. This plan is built around{" "}
            <span className="font-medium text-text">you</span>.
          </p>

          {/* Domain icon toolbar */}
          <div className="mt-8 flex flex-wrap gap-1 md:gap-2">
            {LIFESTYLE_DOMAINS.map((d) => (
              <DomainPill
                key={d.id}
                domain={d}
                active={activeDomain === d.id}
                onClick={() =>
                  setActiveDomain((prev) => (prev === d.id ? null : d.id))
                }
              />
            ))}
          </div>

          {activeDomain && (
            <button
              type="button"
              onClick={() => setActiveDomain(null)}
              className="mt-4 text-xs text-accent hover:text-accent-hover font-medium transition-colors"
            >
              Show all domains
            </button>
          )}
        </div>
      </Card>

      {/* ==================== Quick stats ==================== */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-surface-raised border border-border rounded-xl p-4 text-center shadow-sm">
          <p className="font-display text-2xl font-medium text-text">7</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mt-1">
            Life domains
          </p>
        </div>
        <div className="bg-surface-raised border border-border rounded-xl p-4 text-center shadow-sm">
          <p className="font-display text-2xl font-medium text-text">
            {Object.values(LIFESTYLE_TIPS).reduce(
              (sum, tips) => sum + tips.length,
              0
            )}
          </p>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mt-1">
            Curated tips
          </p>
        </div>
        <div className="bg-surface-raised border border-border rounded-xl p-4 text-center shadow-sm">
          <p className="font-display text-2xl font-medium text-accent">
            <LeafSprig size={20} className="inline -mt-0.5 mr-1" />
            You
          </p>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mt-1">
            Personalized
          </p>
        </div>
      </div>

      <EditorialRule className="mb-10" />

      {/* ==================== Domain cards ==================== */}
      <section>
        <h2 className="font-display text-2xl text-text tracking-tight mb-6">
          {activeDomain
            ? `${LIFESTYLE_DOMAINS.find((d) => d.id === activeDomain)?.icon ?? ""} ${LIFESTYLE_DOMAINS.find((d) => d.id === activeDomain)?.label ?? ""}`
            : "Your wellness toolkit"}
        </h2>

        <div className="space-y-5">
          {displayedDomains.map((domain, idx) => (
            <div key={domain.id}>
              <DomainCard domain={domain} />
              {/* Editorial rule between cards, not after the last one */}
              {idx < displayedDomains.length - 1 &&
                displayedDomains.length > 1 && (
                  <EditorialRule className="my-5" />
                )}
            </div>
          ))}
        </div>
      </section>

      <EditorialRule className="my-10" />

      {/* ==================== Motivational footer ==================== */}
      <Card tone="default" className="mb-4">
        <CardContent className="py-8 text-center">
          <p className="font-display text-xl text-text tracking-tight mb-2">
            You don&apos;t have to do everything at once.
          </p>
          <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
            Pick one domain. Choose the easiest tip. Try it for a week. That
            single step is more powerful than a perfect plan you never start.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2 text-accent/50">
            <LeafSprig size={16} />
            <span className="text-[11px] font-medium uppercase tracking-[0.16em]">
              One step at a time
            </span>
            <LeafSprig size={16} />
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
