"use client";

// Cannabis Wheel — interactive 2-ring radial SVG.
//
// Outer ring: 6 cannabinoid segments (THC, CBD, CBG, CBN, CBC, THCV).
// Inner ring: 6 terpene segments (myrcene, limonene, linalool, pinene,
//             caryophyllene, humulene).
//
// Interaction:
//   - Click a cannabinoid segment → selects it and highlights paired terpenes.
//   - Click a terpene segment     → selects it and shows its detail panel.
//   - Click the center            → clears selection.
//
// Presentation only. Data sourced from src/lib/domain/cannabis-wheel.ts.

import * as React from "react";
import {
  CANNABINOIDS,
  TERPENES,
  type Cannabinoid,
  type CannabinoidId,
  type Terpene,
  type TerpeneId,
} from "@/lib/domain/cannabis-wheel";
import { cn } from "@/lib/utils/cn";

// ── Geometry ────────────────────────────────────────────────
// The SVG uses a 320 viewBox; responsive width scales it from the 280 min
// width on mobile up to ~560 on desktop via the wrapper.

const VIEW = 320;
const CENTER = VIEW / 2;
const OUTER_R = 150; // cannabinoid ring outer edge
const MID_R = 108; // cannabinoid inner / terpene outer edge
const INNER_R = 60; // terpene inner edge
const CORE_R = 46; // center disc

// Cannabinoid color palette — soft, Apple-esque tones.
const CANNABINOID_COLORS: Record<CannabinoidId, { base: string; active: string; text: string }> = {
  thc: { base: "#FDE6C4", active: "#F5A623", text: "#8A4B00" },
  cbd: { base: "#D7F0DC", active: "#4CAF7A", text: "#1F5E39" },
  cbg: { base: "#D6E8FB", active: "#5B9BE8", text: "#1F4A82" },
  cbn: { base: "#E8DEF8", active: "#9C7BD1", text: "#4A2E7E" },
  cbc: { base: "#D4EEEA", active: "#4EBBA8", text: "#1F5E54" },
  thcv: { base: "#FBDCE4", active: "#E86B8E", text: "#862042" },
};

const TERPENE_COLORS: Record<TerpeneId, { base: string; active: string; dim: string; text: string }> = {
  myrcene: { base: "#FBEEDC", active: "#E8B86A", dim: "#F6E4CB", text: "#7A4E16" },
  limonene: { base: "#FEF7C8", active: "#E8C547", dim: "#FAF0B6", text: "#7A5E09" },
  linalool: { base: "#EFE4FA", active: "#A587D8", dim: "#E4D5F2", text: "#502F85" },
  pinene: { base: "#DBF1DC", active: "#6FBA72", dim: "#C7E6CA", text: "#255E29" },
  caryophyllene: { base: "#F6DED2", active: "#D07A57", dim: "#EECFBF", text: "#7A2F12" },
  humulene: { base: "#E0E5D2", active: "#8FA06A", dim: "#CFD7BD", text: "#3F4C22" },
};

// ── Helpers ─────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, rOuter: number, rInner: number, startAngle: number, endAngle: number) {
  const outerStart = polarToCartesian(cx, cy, rOuter, endAngle);
  const outerEnd = polarToCartesian(cx, cy, rOuter, startAngle);
  const innerStart = polarToCartesian(cx, cy, rInner, startAngle);
  const innerEnd = polarToCartesian(cx, cy, rInner, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    "M", outerStart.x, outerStart.y,
    "A", rOuter, rOuter, 0, largeArc, 0, outerEnd.x, outerEnd.y,
    "L", innerStart.x, innerStart.y,
    "A", rInner, rInner, 0, largeArc, 1, innerEnd.x, innerEnd.y,
    "Z",
  ].join(" ");
}

// Place label at the midpoint of a ring segment.
function labelPos(rOuter: number, rInner: number, midAngle: number) {
  const r = (rOuter + rInner) / 2;
  return polarToCartesian(CENTER, CENTER, r, midAngle);
}

// ── Component ───────────────────────────────────────────────

type Selection =
  | { kind: "cannabinoid"; id: CannabinoidId }
  | { kind: "terpene"; id: TerpeneId }
  | null;

export function CannabisWheel() {
  const [selection, setSelection] = React.useState<Selection>(null);

  const pairedTerpenes: Set<TerpeneId> = React.useMemo(() => {
    if (selection?.kind === "cannabinoid") {
      const c = CANNABINOIDS.find((x) => x.id === selection.id);
      return new Set(c?.pairsWith ?? []);
    }
    return new Set();
  }, [selection]);

  const selectedCannabinoid: Cannabinoid | null =
    selection?.kind === "cannabinoid"
      ? CANNABINOIDS.find((c) => c.id === selection.id) ?? null
      : null;

  const selectedTerpene: Terpene | null =
    selection?.kind === "terpene"
      ? TERPENES.find((t) => t.id === selection.id) ?? null
      : null;

  // 6 segments per ring → each 60 degrees.
  const segAngle = 360 / 6;

  return (
    <div className="w-full">
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:gap-10">
        {/* Wheel */}
        <div className="w-full max-w-[420px] sm:max-w-[480px] lg:max-w-[520px]">
          <svg
            viewBox={`0 0 ${VIEW} ${VIEW}`}
            className="h-auto w-full min-w-[280px] select-none"
            role="img"
            aria-label="Interactive cannabinoid and terpene wheel"
          >
            {/* Outer ring — cannabinoids */}
            {CANNABINOIDS.map((c, i) => {
              const start = i * segAngle;
              const end = (i + 1) * segAngle;
              const mid = start + segAngle / 2;
              const isSelected =
                selection?.kind === "cannabinoid" && selection.id === c.id;
              const palette = CANNABINOID_COLORS[c.id];
              const labelP = labelPos(OUTER_R, MID_R, mid);

              return (
                <g
                  key={c.id}
                  onClick={() =>
                    setSelection(isSelected ? null : { kind: "cannabinoid", id: c.id })
                  }
                  className="cursor-pointer"
                >
                  <path
                    d={describeArc(CENTER, CENTER, OUTER_R, MID_R, start, end)}
                    fill={isSelected ? palette.active : palette.base}
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="transition-[fill] duration-300 ease-out"
                    style={{
                      filter: isSelected
                        ? "drop-shadow(0 4px 10px rgba(0,0,0,0.08))"
                        : undefined,
                    }}
                  />
                  <text
                    x={labelP.x}
                    y={labelP.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={15}
                    fontWeight={600}
                    fill={isSelected ? "#ffffff" : palette.text}
                    className="pointer-events-none transition-[fill] duration-300"
                    style={{ fontFamily: "inherit" }}
                  >
                    {c.label}
                  </text>
                </g>
              );
            })}

            {/* Inner ring — terpenes */}
            {TERPENES.map((t, i) => {
              const start = i * segAngle;
              const end = (i + 1) * segAngle;
              const mid = start + segAngle / 2;
              const isSelected =
                selection?.kind === "terpene" && selection.id === t.id;
              const isPaired = pairedTerpenes.has(t.id);
              const palette = TERPENE_COLORS[t.id];

              let fill = palette.base;
              if (isSelected) fill = palette.active;
              else if (selection?.kind === "cannabinoid") {
                fill = isPaired ? palette.active : palette.dim;
              }

              const labelP = labelPos(MID_R, INNER_R, mid);

              return (
                <g
                  key={t.id}
                  onClick={() =>
                    setSelection(isSelected ? null : { kind: "terpene", id: t.id })
                  }
                  className="cursor-pointer"
                >
                  <path
                    d={describeArc(CENTER, CENTER, MID_R, INNER_R, start, end)}
                    fill={fill}
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="transition-[fill,opacity] duration-300 ease-out"
                    style={{
                      opacity:
                        selection?.kind === "cannabinoid" && !isPaired ? 0.55 : 1,
                    }}
                  />
                  <text
                    x={labelP.x}
                    y={labelP.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={10}
                    fontWeight={600}
                    fill={
                      isSelected
                        ? "#ffffff"
                        : selection?.kind === "cannabinoid" && isPaired
                        ? "#ffffff"
                        : palette.text
                    }
                    className="pointer-events-none transition-[fill] duration-300"
                    style={{ fontFamily: "inherit" }}
                  >
                    {t.label}
                  </text>
                </g>
              );
            })}

            {/* Center disc — click to clear */}
            <g
              onClick={() => setSelection(null)}
              className="cursor-pointer"
              aria-label="Clear selection"
            >
              <circle
                cx={CENTER}
                cy={CENTER}
                r={CORE_R}
                fill="#ffffff"
                stroke="#E6E6EA"
                strokeWidth={1.5}
              />
              <text
                x={CENTER}
                y={CENTER - 6}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fontWeight={600}
                fill="#6E6E73"
                className="pointer-events-none"
                style={{ letterSpacing: "0.08em" }}
              >
                CANNABIS
              </text>
              <text
                x={CENTER}
                y={CENTER + 8}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={9}
                fontWeight={500}
                fill="#A1A1A6"
                className="pointer-events-none"
              >
                WHEEL
              </text>
            </g>
          </svg>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-text-subtle">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#F5A623]" />
              Cannabinoids
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#A587D8]" />
              Terpenes
            </span>
          </div>
        </div>

        {/* Detail panel */}
        <div className="w-full lg:flex-1">
          <DetailPanel
            cannabinoid={selectedCannabinoid}
            terpene={selectedTerpene}
            pairedTerpenes={
              selectedCannabinoid
                ? TERPENES.filter((t) => selectedCannabinoid.pairsWith.includes(t.id))
                : []
            }
            onSelectTerpene={(id) => setSelection({ kind: "terpene", id })}
          />
        </div>
      </div>
    </div>
  );
}

// ── Detail panel ────────────────────────────────────────────

function DetailPanel({
  cannabinoid,
  terpene,
  pairedTerpenes,
  onSelectTerpene,
}: {
  cannabinoid: Cannabinoid | null;
  terpene: Terpene | null;
  pairedTerpenes: Terpene[];
  onSelectTerpene: (id: TerpeneId) => void;
}) {
  if (!cannabinoid && !terpene) {
    return (
      <div className="rounded-2xl border border-border/70 bg-white/70 px-6 py-8 text-center shadow-sm backdrop-blur">
        <p className="text-4xl">🌿</p>
        <h3 className="mt-3 font-display text-lg tracking-tight text-text">
          Tap anything on the wheel
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          The outer ring is cannabinoids — the chemical compounds in cannabis.
          The inner ring is terpenes — the aromatic oils that shape how a
          strain feels. Tap a cannabinoid to see which terpenes it commonly
          pairs with.
        </p>
      </div>
    );
  }

  if (terpene) {
    const palette = TERPENE_COLORS[terpene.id];
    return (
      <div
        className="rounded-2xl border border-border/70 bg-white px-6 py-6 shadow-sm"
        style={{ borderLeft: `4px solid ${palette.active}` }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
          Terpene
        </p>
        <h3 className="mt-1 font-display text-2xl tracking-tight text-text">
          {terpene.label}
        </h3>
        <p className="mt-2 text-sm italic text-text-muted">
          Aroma: {terpene.aroma}
        </p>

        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
            What people describe
          </p>
          <ul className="mt-2 space-y-1.5">
            {terpene.effects.map((e) => (
              <li
                key={e}
                className="flex items-start gap-2 text-sm leading-relaxed text-text"
              >
                <span
                  aria-hidden
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: palette.active }}
                />
                {e}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // cannabinoid case
  const c = cannabinoid!;
  const palette = CANNABINOID_COLORS[c.id];
  return (
    <div
      className="rounded-2xl border border-border/70 bg-white px-6 py-6 shadow-sm"
      style={{ borderLeft: `4px solid ${palette.active}` }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
        Cannabinoid
      </p>
      <h3 className="mt-1 font-display text-2xl tracking-tight text-text">
        {c.label}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">
        {c.shortDesc}
      </p>

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
          In plain language
        </p>
        <ul className="mt-2 space-y-1.5">
          {c.effects.map((e) => (
            <li
              key={e}
              className="flex items-start gap-2 text-sm leading-relaxed text-text"
            >
              <span
                aria-hidden
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: palette.active }}
              />
              {e}
            </li>
          ))}
        </ul>
      </div>

      {pairedTerpenes.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
            Commonly pairs with
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {pairedTerpenes.map((t) => {
              const tp = TERPENE_COLORS[t.id];
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTerpene(t.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    "hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0",
                  )}
                  style={{
                    borderColor: tp.active,
                    color: tp.text,
                    background: tp.base,
                  }}
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: tp.active }}
                  />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
