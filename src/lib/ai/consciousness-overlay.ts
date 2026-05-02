/**
 * EMR-136 — AI Consciousness Overlay
 *
 * Ambient AI that watches the chart context and surfaces short,
 * non-intrusive suggestions as toasts. Three categories today:
 *
 *   • Drug interactions — "Warfarin + CBD: monitor INR"
 *   • Care gaps        — "A1C overdue · last drawn 14 mo ago"
 *   • Billing codes    — "Add Z79.4 (long-term insulin use) for E11.9 dx"
 *
 * The deliberate design constraint: suggestions must yield to the
 * clinician. They are dismissable, non-blocking, and rate-limited so
 * the overlay never feels like a chatbot interrupting the work.
 *
 * This module is the brain — pure functions over a structured
 * context. Component lives at components/ai/ConsciousnessOverlay.tsx.
 */

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Context — what the chart hands the brain.                                  */
/* -------------------------------------------------------------------------- */

export const overlayContextSchema = z.object({
  patient: z.object({ id: z.string(), age: z.number().int().nonnegative() }).optional(),
  problems: z.array(z.object({ icd10: z.string(), label: z.string() })).default([]),
  medications: z
    .array(z.object({ name: z.string(), dose: z.string().optional() }))
    .default([]),
  labs: z
    .array(
      z.object({
        name: z.string(),
        value: z.number().optional(),
        flag: z.enum(["low", "normal", "high", "critical", "unknown"]).default("unknown"),
        collectedAt: z.string(),
      }),
    )
    .default([]),
  /** Which surface the clinician is on — gates billing-code suggestions. */
  surface: z
    .enum(["chart", "note", "prescribe", "labs", "billing"])
    .default("chart"),
});

export type OverlayContext = z.infer<typeof overlayContextSchema>;

/* -------------------------------------------------------------------------- */
/* Suggestion shape                                                           */
/* -------------------------------------------------------------------------- */

export type SuggestionKind = "interaction" | "care-gap" | "billing-code";

export type SuggestionTone = "info" | "warning" | "critical";

export interface OverlaySuggestion {
  /** Stable id used for dismissal + rate-limiting. */
  id: string;
  kind: SuggestionKind;
  tone: SuggestionTone;
  title: string;
  body: string;
  /** Optional action button label + payload the host wires up. */
  cta?: { label: string; action: string; payload?: Record<string, unknown> };
  /** Higher = more urgent. Used to cap how many we show at once. */
  priority: number;
}

/* -------------------------------------------------------------------------- */
/* Built-in detectors                                                         */
/* -------------------------------------------------------------------------- */

interface InteractionRule {
  a: string;
  b: string;
  warning: string;
  tone: SuggestionTone;
}

const INTERACTION_RULES: InteractionRule[] = [
  {
    a: "warfarin",
    b: "cbd",
    warning: "Monitor INR — CBD inhibits CYP2C9 and can prolong warfarin's effect.",
    tone: "warning",
  },
  {
    a: "warfarin",
    b: "ibuprofen",
    warning: "Bleed risk — both increase GI bleeding. Use acetaminophen if possible.",
    tone: "critical",
  },
  {
    a: "metformin",
    b: "contrast",
    warning: "Hold metformin around iodinated contrast to prevent lactic acidosis.",
    tone: "warning",
  },
  {
    a: "lisinopril",
    b: "potassium",
    warning: "Hyperkalemia risk — check K+ before refilling.",
    tone: "warning",
  },
  {
    a: "sertraline",
    b: "tramadol",
    warning: "Serotonin syndrome risk — avoid the combination.",
    tone: "critical",
  },
  {
    a: "thc",
    b: "clobazam",
    warning: "THC can boost clobazam levels. Watch for sedation.",
    tone: "warning",
  },
];

function findInteractions(meds: OverlayContext["medications"]): OverlaySuggestion[] {
  if (meds.length < 2) return [];
  const names = meds.map((m) => m.name.toLowerCase());
  const out: OverlaySuggestion[] = [];
  for (const rule of INTERACTION_RULES) {
    const hasA = names.some((n) => n.includes(rule.a));
    const hasB = names.some((n) => n.includes(rule.b));
    if (hasA && hasB) {
      out.push({
        id: `rx:${rule.a}:${rule.b}`,
        kind: "interaction",
        tone: rule.tone,
        title: `${cap(rule.a)} + ${cap(rule.b)}`,
        body: rule.warning,
        priority: rule.tone === "critical" ? 90 : 70,
        cta: {
          label: "Open interaction check",
          action: "open-interaction",
          payload: { a: rule.a, b: rule.b },
        },
      });
    }
  }
  return out;
}

interface CareGap {
  problem: RegExp;
  lab: RegExp;
  /** Months since last draw beyond which the gap fires. */
  staleAfterMonths: number;
  hint: string;
}

const CARE_GAPS: CareGap[] = [
  { problem: /diabet|E11/i, lab: /^a1c$/i, staleAfterMonths: 6, hint: "A1C is the cornerstone metric for type-2 diabetes follow-up." },
  { problem: /lipid|cholest|I25|hyperlip/i, lab: /^ldl$/i, staleAfterMonths: 12, hint: "Annual lipid panel is recommended for cardiovascular risk monitoring." },
  { problem: /hyperten|I10/i, lab: /^bp$|blood pressure/i, staleAfterMonths: 1, hint: "BP should be checked at every visit for active hypertension." },
  { problem: /hypothy|E03/i, lab: /^tsh$/i, staleAfterMonths: 12, hint: "TSH yearly for stable hypothyroidism." },
];

function findCareGaps(ctx: OverlayContext): OverlaySuggestion[] {
  const out: OverlaySuggestion[] = [];
  const now = Date.now();
  for (const gap of CARE_GAPS) {
    const matchesProblem = ctx.problems.some(
      (p) => gap.problem.test(p.icd10) || gap.problem.test(p.label),
    );
    if (!matchesProblem) continue;

    const lastLab = ctx.labs
      .filter((l) => gap.lab.test(l.name))
      .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))[0];

    let monthsSince = Infinity;
    if (lastLab) {
      const ageMs = now - new Date(lastLab.collectedAt).getTime();
      monthsSince = ageMs / (30 * 24 * 60 * 60 * 1000);
    }

    if (monthsSince > gap.staleAfterMonths) {
      out.push({
        id: `gap:${gap.lab.source}`,
        kind: "care-gap",
        tone: monthsSince > gap.staleAfterMonths * 2 ? "warning" : "info",
        title: `${gap.lab.source.toUpperCase().replace(/[^A-Z0-9]/g, "")} overdue`,
        body: lastLab
          ? `Last drawn ${Math.round(monthsSince)} mo ago. ${gap.hint}`
          : `No record on file. ${gap.hint}`,
        priority: 50,
        cta: { label: "Order lab", action: "order-lab", payload: { name: gap.lab.source } },
      });
    }
  }
  return out;
}

interface BillingHint {
  /** Triggers when one of these regexes matches a problem. */
  problem: RegExp;
  /** Suggested companion ICD-10. */
  code: string;
  label: string;
  /** Only fires if the patient is on at least one medication matching this regex. */
  med?: RegExp;
}

const BILLING_HINTS: BillingHint[] = [
  { problem: /E11/i, med: /insulin/i, code: "Z79.4", label: "Long-term insulin use" },
  { problem: /I10/i, med: /lisinopril|losartan/i, code: "Z79.899", label: "Long-term drug therapy" },
  { problem: /F32|F33/i, med: /sertraline|fluoxetine|escitalopram/i, code: "Z79.899", label: "Long-term SSRI use" },
  { problem: /E78/i, med: /atorvastatin|simvastatin|rosuvastatin/i, code: "Z79.899", label: "Long-term statin use" },
];

function findBillingCodes(ctx: OverlayContext): OverlaySuggestion[] {
  if (ctx.surface !== "billing" && ctx.surface !== "note") return [];
  const out: OverlaySuggestion[] = [];
  const meds = ctx.medications.map((m) => m.name.toLowerCase()).join(" ");
  for (const hint of BILLING_HINTS) {
    const matchesProblem = ctx.problems.some(
      (p) => hint.problem.test(p.icd10) || hint.problem.test(p.label),
    );
    if (!matchesProblem) continue;
    if (hint.med && !hint.med.test(meds)) continue;
    out.push({
      id: `bill:${hint.code}`,
      kind: "billing-code",
      tone: "info",
      title: `Consider ${hint.code}`,
      body: `${hint.label} — pairs with the active diagnosis on this encounter.`,
      priority: 30,
      cta: { label: "Add code", action: "add-icd", payload: { code: hint.code } },
    });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export interface DeriveSuggestionsOptions {
  /** Suggestions the clinician already dismissed in this session. */
  dismissed?: Set<string>;
  /** Cap how many we surface at once. Default 3. */
  max?: number;
}

/** Run all detectors and return the prioritized suggestion list. */
export function deriveSuggestions(
  context: OverlayContext,
  opts: DeriveSuggestionsOptions = {},
): OverlaySuggestion[] {
  const { dismissed, max = 3 } = opts;
  const all = [
    ...findInteractions(context.medications),
    ...findCareGaps(context),
    ...findBillingCodes(context),
  ];
  return all
    .filter((s) => !dismissed?.has(s.id))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, max);
}

function cap(s: string): string {
  if (!s) return s;
  return s[0]!.toUpperCase() + s.slice(1);
}
