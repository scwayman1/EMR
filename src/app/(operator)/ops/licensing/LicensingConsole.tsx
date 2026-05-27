"use client";

// EMR-044 / EMR-147 — Interactive licensing console (client).
//
// Premium Michelin-style licensing menu. Operators pick a tier, toggle
// individual modules à la carte, watch the running price update in real
// time, inspect EHR connection stubs (Epic / Cerner / Practice Fusion),
// and export a print-ready brochure for prospect handoff.

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Transition } from "framer-motion";
import {
  Award,
  Building2,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  Gauge,
  Plug,
  Plus,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type {
  ComparisonMatrix,
  IntegrationConnectionState,
  LicensingPosture,
  MichelinTierProfile,
} from "@/lib/platform/licensing";
import type { MenuCourse } from "@/lib/platform/licensing-menu";
import type { ModuleTier } from "@/lib/platform/modules";

interface Props {
  posture: LicensingPosture;
  matrix: ComparisonMatrix;
  courses: MenuCourse[];
  tiers: MichelinTierProfile[];
}

const STAR_LABEL: Record<number, string> = {
  3: "Three-star · production ready",
  2: "Two-star · battle-tested in pilots",
  1: "One-star · preview, schema stable",
  0: "Tasting menu · in development",
};

const TIER_ACCENT: Record<ModuleTier, string> = {
  starter: "from-amber-700/30 via-amber-500/15 to-transparent",
  professional: "from-slate-400/30 via-slate-300/10 to-transparent",
  canopy: "from-yellow-400/40 via-amber-300/15 to-transparent",
  enterprise: "from-fuchsia-400/30 via-violet-400/20 to-transparent",
};

const TIER_RING: Record<ModuleTier, string> = {
  starter: "ring-amber-500/50",
  professional: "ring-slate-200/60",
  canopy: "ring-yellow-300/80",
  enterprise: "ring-fuchsia-300/80",
};

export function LicensingConsole({ posture, matrix, courses, tiers }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const transition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 220, damping: 26 };

  const [selectedTier, setSelectedTier] = useState<ModuleTier>(posture.tier.id);
  const [addOns, setAddOns] = useState<Set<string>>(
    () => new Set(posture.addOns),
  );

  const moduleById = useMemo(() => {
    const map = new Map(posture.modules.map((m) => [m.id, m] as const));
    return map;
  }, [posture.modules]);

  const tierProfile = tiers.find((t) => t.id === selectedTier)!;

  const includedByTier = useMemo(() => {
    const set = new Set<string>();
    for (const pillar of matrix.rowsByPillar) {
      for (const row of pillar.rows) {
        if (row.cells[selectedTier].kind === "included") set.add(row.module.id);
      }
    }
    return set;
  }, [matrix, selectedTier]);

  const effectiveAddOns = useMemo(() => {
    const out = new Set<string>();
    for (const id of addOns) if (!includedByTier.has(id)) out.add(id);
    return out;
  }, [addOns, includedByTier]);

  const addOnTotal = useMemo(() => {
    let total = 0;
    for (const id of effectiveAddOns) {
      const m = moduleById.get(id);
      if (m?.alaCarteMonthly) total += m.alaCarteMonthly;
    }
    return total;
  }, [effectiveAddOns, moduleById]);

  const tierList = tierProfile.monthlyList;
  const monthlyTotalLabel =
    tierList == null
      ? "Contact us"
      : `$${(tierList + addOnTotal).toLocaleString()} / provider / mo`;

  const activeModuleCount =
    includedByTier.size + effectiveAddOns.size;

  function toggleAddOn(id: string) {
    setAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div
      className="min-h-screen text-slate-100"
      style={{
        background:
          "radial-gradient(ellipse 1200px 600px at 15% -10%, rgba(124,58,237,0.25), transparent 60%), " +
          "radial-gradient(ellipse 900px 500px at 110% 10%, rgba(245,158,11,0.18), transparent 55%), " +
          "linear-gradient(180deg, #07090f 0%, #0b1020 45%, #05070d 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 lg:px-12 py-10 space-y-10">
        <Header
          posture={posture}
          activeTier={tierProfile}
          monthlyLabel={monthlyTotalLabel}
          activeModuleCount={activeModuleCount}
        />

        <TierStrip
          tiers={tiers}
          selectedTier={selectedTier}
          onSelect={setSelectedTier}
          transition={transition}
        />

        <MatrixSection
          matrix={matrix}
          selectedTier={selectedTier}
          effectiveAddOns={effectiveAddOns}
          onToggleAddOn={toggleAddOn}
        />

        <CourseSection courses={courses} transition={transition} />

        <IntegrationsSection integrations={posture.integrations} />

        <PriceBar
          tierLabel={tierProfile.label}
          tierMonthly={tierList}
          addOnCount={effectiveAddOns.size}
          addOnTotal={addOnTotal}
          monthlyTotalLabel={monthlyTotalLabel}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header — eyebrow, title, brochure actions
// ---------------------------------------------------------------------------

function Header({
  posture,
  activeTier,
  monthlyLabel,
  activeModuleCount,
}: {
  posture: LicensingPosture;
  activeTier: MichelinTierProfile;
  monthlyLabel: string;
  activeModuleCount: number;
}) {
  return (
    <Glass className="p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            Edition {posture.version} · {posture.tier.michelin} tier
          </p>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight mt-2 text-white">
            Licensing menu
          </h1>
          <p className="text-sm text-slate-300/80 mt-3 leading-relaxed">
            Pick a tier, toggle modules à la carte, and price your deployment
            in real time. Every module ships with audit, BAA, and a fleet of
            agents ready to come online when the bit is flipped.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/api/platform/licensing/menu.html"
            target="_blank"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 backdrop-blur transition hover:bg-amber-400/20"
          >
            <Download className="h-4 w-4" />
            Download brochure (PDF)
          </Link>
          <Link
            href="/api/platform/licensing"
            target="_blank"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-100 backdrop-blur transition hover:bg-white/10"
          >
            <ExternalLink className="h-4 w-4" />
            Posture JSON
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-7">
        <StatTile
          icon={<Award className="h-4 w-4" />}
          label="Active tier"
          value={activeTier.label}
          accent={TIER_RING[activeTier.id]}
        />
        <StatTile
          icon={<Gauge className="h-4 w-4" />}
          label="Live monthly list"
          value={monthlyLabel}
        />
        <StatTile
          icon={<Star className="h-4 w-4" />}
          label="Active modules"
          value={`${activeModuleCount}`}
        />
        <StatTile
          icon={<Building2 className="h-4 w-4" />}
          label="Organization"
          value={posture.organizationId}
        />
      </div>
    </Glass>
  );
}

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md ring-1 ring-white/5",
        accent && `ring-2 ${accent}`,
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300/70 flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="font-display text-lg text-white mt-1 truncate">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tier strip — Bronze / Silver / Gold / Platinum selector
// ---------------------------------------------------------------------------

function TierStrip({
  tiers,
  selectedTier,
  onSelect,
  transition,
}: {
  tiers: MichelinTierProfile[];
  selectedTier: ModuleTier;
  onSelect: (id: ModuleTier) => void;
  transition: Transition;
}) {
  return (
    <section>
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-xl text-white tracking-tight">
          Choose a tier
        </h2>
        <p className="text-xs text-slate-400">
          Bronze · Silver · Gold · Platinum — each Michelin tier maps to a
          curated module bundle.
        </p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.map((t) => {
          const active = t.id === selectedTier;
          return (
            <motion.button
              key={t.id}
              onClick={() => onSelect(t.id)}
              type="button"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.985 }}
              transition={transition}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left backdrop-blur-xl ring-1 transition-shadow",
                active
                  ? `ring-2 ${TIER_RING[t.id]} shadow-[0_0_60px_-20px_rgba(245,158,11,0.6)]`
                  : "ring-white/5 hover:ring-white/15",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full blur-3xl opacity-70 bg-gradient-to-br",
                  TIER_ACCENT[t.id],
                )}
              />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80">
                    {t.michelin}
                  </p>
                  <p className="font-display text-xl text-white mt-1">
                    {t.label}
                  </p>
                </div>
                {active && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-100 ring-1 ring-amber-200/30">
                    <Check className="h-3 w-3" />
                    Selected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300/80 mt-3 italic">{t.blurb}</p>
              <p className="text-sm font-medium text-white mt-4">
                {t.monthlyLabel}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {t.bestFor}
              </p>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Comparison matrix — pillar-grouped rows with à-la-carte toggle
// ---------------------------------------------------------------------------

function MatrixSection({
  matrix,
  selectedTier,
  effectiveAddOns,
  onToggleAddOn,
}: {
  matrix: ComparisonMatrix;
  selectedTier: ModuleTier;
  effectiveAddOns: Set<string>;
  onToggleAddOn: (id: string) => void;
}) {
  return (
    <section>
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-xl text-white tracking-tight">
          Feature comparison
        </h2>
        <p className="text-xs text-slate-400">
          Toggle the checkbox to add a module on top of your tier — the bar
          below updates instantly.
        </p>
      </header>

      <Glass className="overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="font-medium text-slate-300/70 px-3 py-3 w-[34%]">
                Module
              </th>
              {matrix.tiers.map((t) => (
                <th
                  key={t.id}
                  className={cn(
                    "font-medium text-slate-300/70 px-2 py-3 text-center",
                    t.id === selectedTier && "text-amber-100",
                  )}
                >
                  {t.label}
                </th>
              ))}
              <th className="font-medium text-slate-300/70 px-3 py-3 text-right">
                À la carte
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.rowsByPillar
              .filter((p) => p.rows.length > 0)
              .map((pillar) => (
                <PillarRows
                  key={pillar.pillar}
                  pillar={pillar}
                  selectedTier={selectedTier}
                  effectiveAddOns={effectiveAddOns}
                  onToggleAddOn={onToggleAddOn}
                />
              ))}
          </tbody>
        </table>
      </Glass>
    </section>
  );
}

function PillarRows({
  pillar,
  selectedTier,
  effectiveAddOns,
  onToggleAddOn,
}: {
  pillar: ComparisonMatrix["rowsByPillar"][number];
  selectedTier: ModuleTier;
  effectiveAddOns: Set<string>;
  onToggleAddOn: (id: string) => void;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={6}
          className="pt-5 pb-1 px-3 text-[11px] uppercase tracking-[0.16em] text-amber-200/70"
        >
          {pillar.pillarLabel}
        </td>
      </tr>
      {pillar.rows.map((r) => {
        const includedHere = r.cells[selectedTier].kind === "included";
        const addOnable =
          !includedHere && r.module.alaCarteMonthly != null;
        const isAddOn = effectiveAddOns.has(r.module.id);
        return (
          <tr
            key={r.module.id}
            className="border-t border-white/5 align-top"
          >
            <td className="px-3 py-3">
              <div className="flex items-start gap-3">
                {addOnable ? (
                  <button
                    type="button"
                    onClick={() => onToggleAddOn(r.module.id)}
                    aria-label={
                      isAddOn
                        ? `Remove ${r.module.name} add-on`
                        : `Add ${r.module.name} as an add-on`
                    }
                    className={cn(
                      "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition",
                      isAddOn
                        ? "border-amber-300/80 bg-amber-400/30 text-amber-50"
                        : "border-white/20 bg-white/5 text-transparent hover:border-amber-200/60",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-500">
                    {includedHere ? <Check className="h-4 w-4" /> : "·"}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-white flex items-center gap-2">
                    {r.module.name}
                    <span
                      title={STAR_LABEL[r.stars] ?? r.starsLabel}
                      className="text-amber-300/90 text-[11px]"
                    >
                      {"★".repeat(r.stars)}
                      {"☆".repeat(Math.max(0, 3 - r.stars))}
                    </span>
                  </p>
                  <p className="text-[11px] italic text-slate-400">
                    {r.module.tagline}
                  </p>
                </div>
              </div>
            </td>
            {(["starter", "professional", "canopy", "enterprise"] as ModuleTier[]).map(
              (tid) => {
                const cell = r.cells[tid];
                const tone =
                  cell.kind === "included"
                    ? "bg-emerald-400/15 text-emerald-100 border-emerald-300/30"
                    : cell.kind === "addon"
                      ? "bg-amber-400/10 text-amber-100 border-amber-300/20"
                      : cell.kind === "roadmap"
                        ? "bg-white/5 text-slate-400 italic border-white/10"
                        : "text-slate-500 border-transparent";
                const highlight =
                  tid === selectedTier
                    ? "ring-1 ring-amber-200/50"
                    : "";
                return (
                  <td key={tid} className="px-1 py-2">
                    <div
                      className={cn(
                        "rounded-md border px-2 py-1 text-[11px] text-center backdrop-blur-sm",
                        tone,
                        highlight,
                      )}
                    >
                      {cell.label}
                    </div>
                  </td>
                );
              },
            )}
            <td className="px-3 py-2 text-right text-[12px] text-slate-300">
              {r.priceDisplay}
            </td>
          </tr>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Course menu — Michelin narrative
// ---------------------------------------------------------------------------

function CourseSection({
  courses,
  transition,
}: {
  courses: MenuCourse[];
  transition: Transition;
}) {
  return (
    <section>
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-xl text-white tracking-tight">
          Course menu
        </h2>
        <p className="text-xs text-slate-400">
          Three stars: production. Two stars: pilot-grade. One star: preview.
        </p>
      </header>

      <div className="space-y-5">
        {courses.map((course) => (
          <Glass key={course.pillar} className="p-5 md:p-6">
            <header className="mb-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80">
                {course.pillarLabel}
              </p>
              <p className="italic text-slate-300/80 text-sm mt-1">
                {course.blurb}
              </p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {course.modules.map((m) => (
                <motion.article
                  key={m.id}
                  whileHover={{ y: -2 }}
                  transition={transition}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white flex items-center gap-2">
                        {m.name}
                        <span
                          className="text-amber-300/90 text-xs"
                          title={STAR_LABEL[m.stars] ?? m.starsLabel}
                        >
                          {"★".repeat(m.stars)}
                          {"☆".repeat(Math.max(0, 3 - m.stars))}
                        </span>
                      </p>
                      <p className="italic text-[12px] text-slate-300/80 mt-1">
                        {m.tagline}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-slate-200">
                      {m.priceDisplay}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-300/75 mt-2 leading-relaxed">
                    {m.description}
                  </p>
                </motion.article>
              ))}
            </div>
          </Glass>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Integrations — EHR connection stubs
// ---------------------------------------------------------------------------

function IntegrationsSection({
  integrations,
}: {
  integrations: IntegrationConnectionState[];
}) {
  return (
    <section>
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-xl text-white tracking-tight">
          Conventional EMR bridges
        </h2>
        <p className="text-xs text-slate-400">
          Sit alongside Epic, Cerner and Practice Fusion — not replace them.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {integrations.map((i) => (
          <Glass key={i.vendor} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-200">
                <Plug className="h-4 w-4 text-amber-200/80" />
                <p className="font-medium text-white">{i.label}</p>
              </div>
              <StatusPill status={i.status} />
            </div>
            <p className="text-[12px] text-slate-300/75 mt-3 leading-relaxed">
              {i.detail}
            </p>
            <div className="mt-4 flex items-center justify-end text-amber-200/80 text-[12px]">
              Manage <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </Glass>
        ))}
      </div>
    </section>
  );
}

function StatusPill({
  status,
}: {
  status: IntegrationConnectionState["status"];
}) {
  const map: Record<
    IntegrationConnectionState["status"],
    { label: string; tone: string; Icon: typeof Check }
  > = {
    connected: {
      label: "Connected",
      tone: "bg-emerald-400/15 text-emerald-100 ring-emerald-300/40",
      Icon: Check,
    },
    configured: {
      label: "Configured",
      tone: "bg-sky-400/15 text-sky-100 ring-sky-300/40",
      Icon: Plug,
    },
    available: {
      label: "Available",
      tone: "bg-amber-400/15 text-amber-100 ring-amber-300/40",
      Icon: Plus,
    },
    coming_soon: {
      label: "Coming soon",
      tone: "bg-white/5 text-slate-300 ring-white/15 italic",
      Icon: X,
    },
  };
  const { label, tone, Icon } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ring-1 backdrop-blur-sm",
        tone,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sticky price bar
// ---------------------------------------------------------------------------

function PriceBar({
  tierLabel,
  tierMonthly,
  addOnCount,
  addOnTotal,
  monthlyTotalLabel,
}: {
  tierLabel: string;
  tierMonthly: number | null;
  addOnCount: number;
  addOnTotal: number;
  monthlyTotalLabel: string;
}) {
  return (
    <div className="sticky bottom-4 z-30">
      <Glass className="px-5 py-4 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.6)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-2 text-slate-200">
              <Award className="h-4 w-4 text-amber-200/80" />
              <span className="font-medium text-white">{tierLabel}</span>
              <span className="text-slate-400">
                {tierMonthly == null
                  ? "Contact us"
                  : `$${tierMonthly.toLocaleString()}/mo`}
              </span>
            </span>
            <span className="hidden md:inline text-slate-500">+</span>
            <span className="inline-flex items-center gap-2 text-slate-200">
              <Plus className="h-4 w-4 text-amber-200/80" />
              {addOnCount} add-on{addOnCount === 1 ? "" : "s"}{" "}
              <span className="text-slate-400">
                ${addOnTotal.toLocaleString()}/mo
              </span>
            </span>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80">
              Running total
            </p>
            <p className="font-display text-2xl text-white">
              {monthlyTotalLabel}
            </p>
          </div>
        </div>
      </Glass>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Glass primitive — dark glassmorphism container
// ---------------------------------------------------------------------------

function Glass({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-xl ring-1 ring-white/5 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.6)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
