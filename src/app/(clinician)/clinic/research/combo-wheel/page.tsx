"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, LeafSprig, EditorialRule } from "@/components/ui/ornament";

// ---------------------------------------------------------------------------
// Data: Cannabinoids, Terpenes, and their therapeutic profiles
// ---------------------------------------------------------------------------

interface Compound {
  id: string;
  name: string;
  type: "cannabinoid" | "terpene" | "flavonoid";
  color: string;
  symptoms: string[];
  risks: string[];
  benefits: string[];
  evidence: "strong" | "moderate" | "emerging";
  description: string;
}

const COMPOUNDS: Compound[] = [
  {
    id: "thc",
    name: "THC",
    type: "cannabinoid",
    color: "#3A8560",
    symptoms: ["Pain", "Nausea", "Insomnia", "Appetite loss", "PTSD", "Muscle spasms"],
    risks: ["Psychoactivity", "Anxiety at high doses", "Cognitive effects", "Dependence risk"],
    benefits: ["Potent analgesic", "Antiemetic", "Sleep aid", "Appetite stimulant"],
    evidence: "strong",
    description: "Primary psychoactive cannabinoid. CB1/CB2 agonist. Start low (2.5mg), titrate slowly.",
  },
  {
    id: "cbd",
    name: "CBD",
    type: "cannabinoid",
    color: "#4A90D9",
    symptoms: ["Anxiety", "Inflammation", "Seizures", "Pain", "Insomnia"],
    risks: ["Drug interactions (CYP2D6, CYP3A4)", "Liver enzyme elevation at very high doses"],
    benefits: ["Non-intoxicating", "Anxiolytic", "Anti-inflammatory", "Neuroprotective", "Modulates THC effects"],
    evidence: "strong",
    description: "Non-psychoactive. Negative allosteric modulator at CB1. FDA-approved for epilepsy (Epidiolex).",
  },
  {
    id: "cbn",
    name: "CBN",
    type: "cannabinoid",
    color: "#7D3F9B",
    symptoms: ["Insomnia", "Pain", "Inflammation"],
    risks: ["Limited safety data", "Mild sedation"],
    benefits: ["Sedating", "Pain relief", "Anti-inflammatory"],
    evidence: "emerging",
    description: "Mildly sedating oxidation product of THC. Best for sleep formulations.",
  },
  {
    id: "cbg",
    name: "CBG",
    type: "cannabinoid",
    color: "#D4944F",
    symptoms: ["Anxiety", "Inflammation", "IBD", "Glaucoma"],
    risks: ["Limited long-term data"],
    benefits: ["Anxiolytic", "Anti-inflammatory", "Neuroprotective", "Non-intoxicating"],
    evidence: "emerging",
    description: "Parent cannabinoid. 2024 trial: single 20mg dose reduced anxiety within 20 minutes.",
  },
  {
    id: "thca",
    name: "THCA",
    type: "cannabinoid",
    color: "#5C8A4F",
    symptoms: ["Nausea", "Inflammation", "Neurodegeneration"],
    risks: ["Converts to THC with heat"],
    benefits: ["Non-intoxicating (raw)", "Anti-inflammatory", "Antiemetic"],
    evidence: "emerging",
    description: "Raw, unheated form of THC. Non-psychoactive until decarboxylated.",
  },
  {
    id: "cbda",
    name: "CBDA",
    type: "cannabinoid",
    color: "#3A6B9B",
    symptoms: ["Nausea", "Anxiety", "Inflammation"],
    risks: ["Unstable — converts to CBD with heat"],
    benefits: ["Potent antiemetic", "Anti-inflammatory", "Non-intoxicating"],
    evidence: "emerging",
    description: "Raw form of CBD. Shows greater 5-HT1A affinity than CBD in preclinical models.",
  },
  // Terpenes
  {
    id: "myrcene",
    name: "Myrcene",
    type: "terpene",
    color: "#6DAF6D",
    symptoms: ["Pain", "Insomnia", "Inflammation", "Muscle tension"],
    risks: ["Sedation at high doses"],
    benefits: ["Sedating", "Analgesic", "Anti-inflammatory", "Enhances THC absorption"],
    evidence: "moderate",
    description: "Most abundant cannabis terpene. Also in hops, mango. Promotes relaxation and sleep.",
  },
  {
    id: "limonene",
    name: "Limonene",
    type: "terpene",
    color: "#F6D365",
    symptoms: ["Depression", "Anxiety", "Stress", "Nausea"],
    risks: ["May cause reflux in sensitive individuals"],
    benefits: ["Mood elevation", "Anxiolytic", "Antifungal", "Gastroprotective"],
    evidence: "moderate",
    description: "Citrus terpene. Uplifting, mood-enhancing. Found in lemon, orange, and sativa-dominant strains.",
  },
  {
    id: "linalool",
    name: "Linalool",
    type: "terpene",
    color: "#B388D9",
    symptoms: ["Anxiety", "Insomnia", "Pain", "Seizures"],
    risks: ["Potential skin sensitivity (topical)"],
    benefits: ["Calming", "Anxiolytic", "Analgesic", "Anticonvulsant"],
    evidence: "moderate",
    description: "Floral terpene also in lavender. Calming, stress-reducing. Synergizes with CBD for anxiety.",
  },
  {
    id: "pinene",
    name: "Pinene",
    type: "terpene",
    color: "#4A7A5C",
    symptoms: ["Inflammation", "Asthma", "Cognitive fog"],
    risks: ["May counteract sedating effects"],
    benefits: ["Bronchodilator", "Anti-inflammatory", "Memory aid", "Alertness"],
    evidence: "moderate",
    description: "Pine/fir scent. May counteract THC-related memory impairment. Found in rosemary, basil.",
  },
  {
    id: "caryophyllene",
    name: "Caryophyllene",
    type: "terpene",
    color: "#8B6F47",
    symptoms: ["Pain", "Inflammation", "Anxiety", "Depression"],
    risks: ["Generally well tolerated"],
    benefits: ["CB2 agonist (unique terpene)", "Anti-inflammatory", "Analgesic", "Gastroprotective"],
    evidence: "moderate",
    description: "Only terpene that binds CB2 directly. Also in black pepper, cloves. Anti-inflammatory powerhouse.",
  },
  {
    id: "humulene",
    name: "Humulene",
    type: "terpene",
    color: "#9B7A3A",
    symptoms: ["Inflammation", "Pain", "Appetite (suppressant)"],
    risks: ["May reduce appetite"],
    benefits: ["Anti-inflammatory", "Appetite suppressant", "Antibacterial"],
    evidence: "emerging",
    description: "Also in hops and ginger. Unique appetite-suppressing terpene — rare in cannabis therapeutics.",
  },
];

// ---------------------------------------------------------------------------
// Combo Wheel SVG
// ---------------------------------------------------------------------------

function ComboWheel({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const outerRadius = 180;
  const innerRadius = 80;
  const cx = 200;
  const cy = 200;

  const cannabinoids = COMPOUNDS.filter((c) => c.type === "cannabinoid");
  const terpenes = COMPOUNDS.filter((c) => c.type === "terpene");
  const all = [...cannabinoids, ...terpenes];

  return (
    <svg
      width={400}
      height={400}
      viewBox="0 0 400 400"
      className="w-full max-w-[400px] mx-auto select-none"
    >
      <style>{`
        .wheel-segment { cursor: pointer; transition: opacity 0.2s, transform 0.15s; }
        .wheel-segment:hover { opacity: 0.9; }
      `}</style>

      {/* Background glow */}
      <defs>
        <radialGradient id="wheel-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent-soft)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--accent-soft)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={outerRadius + 10} fill="url(#wheel-glow)" />

      {/* Outer ring — segments for each compound */}
      {all.map((compound, i) => {
        const angleStep = (2 * Math.PI) / all.length;
        const startAngle = i * angleStep - Math.PI / 2;
        const endAngle = startAngle + angleStep;
        const gap = 0.02; // small gap between segments

        const r1 = innerRadius + 20;
        const r2 = outerRadius;

        const x1 = cx + r1 * Math.cos(startAngle + gap);
        const y1 = cy + r1 * Math.sin(startAngle + gap);
        const x2 = cx + r2 * Math.cos(startAngle + gap);
        const y2 = cy + r2 * Math.sin(startAngle + gap);
        const x3 = cx + r2 * Math.cos(endAngle - gap);
        const y3 = cy + r2 * Math.sin(endAngle - gap);
        const x4 = cx + r1 * Math.cos(endAngle - gap);
        const y4 = cy + r1 * Math.sin(endAngle - gap);

        const largeArc = angleStep - 2 * gap > Math.PI ? 1 : 0;
        const isSelected = selected.has(compound.id);

        // Label position
        const midAngle = (startAngle + endAngle) / 2;
        const labelR = (r1 + r2) / 2;
        const lx = cx + labelR * Math.cos(midAngle);
        const ly = cy + labelR * Math.sin(midAngle);
        const textRotation = (midAngle * 180) / Math.PI + 90;

        return (
          <g
            key={compound.id}
            className="wheel-segment"
            onClick={() => onToggle(compound.id)}
          >
            <path
              d={`
                M ${x1} ${y1}
                L ${x2} ${y2}
                A ${r2} ${r2} 0 ${largeArc} 1 ${x3} ${y3}
                L ${x4} ${y4}
                A ${r1} ${r1} 0 ${largeArc} 0 ${x1} ${y1}
                Z
              `}
              fill={compound.color}
              opacity={isSelected ? 1 : 0.35}
              stroke={isSelected ? "#fff" : "none"}
              strokeWidth={isSelected ? 2 : 0}
            />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#fff"
              fontSize={compound.name.length > 8 ? 8 : 10}
              fontWeight="600"
              fontFamily="var(--font-sans)"
              transform={`rotate(${textRotation} ${lx} ${ly})`}
              style={{ pointerEvents: "none" }}
            >
              {compound.name}
            </text>
          </g>
        );
      })}

      {/* Inner circle — type indicator */}
      <circle
        cx={cx}
        cy={cy}
        r={innerRadius + 14}
        fill="none"
        stroke="var(--border)"
        strokeWidth={1}
        opacity={0.4}
      />
      <circle cx={cx} cy={cy} r={innerRadius} fill="var(--surface-raised)" />

      {/* Center content */}
      <text
        x={cx}
        y={cy - 14}
        textAnchor="middle"
        fill="var(--text)"
        fontSize={14}
        fontWeight="600"
        fontFamily="var(--font-display)"
      >
        {selected.size === 0 ? "Select" : `${selected.size} selected`}
      </text>
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        fill="var(--text-muted)"
        fontSize={10}
        fontFamily="var(--font-sans)"
      >
        {selected.size === 0 ? "Tap compounds" : "Tap to toggle"}
      </text>
      <text
        x={cx}
        y={cy + 22}
        textAnchor="middle"
        fill="var(--accent)"
        fontSize={9}
        fontFamily="var(--font-sans)"
      >
        Combo Wheel
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ComboWheelPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedCompounds = COMPOUNDS.filter((c) => selected.has(c.id));

  // Compute combined profile
  const allSymptoms = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of selectedCompounds) {
      for (const s of c.symptoms) {
        counts[s] = (counts[s] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));
  }, [selectedCompounds]);

  const allBenefits = useMemo(
    () => [...new Set(selectedCompounds.flatMap((c) => c.benefits))],
    [selectedCompounds],
  );

  const allRisks = useMemo(
    () => [...new Set(selectedCompounds.flatMap((c) => c.risks))],
    [selectedCompounds],
  );

  const evidenceLevel = useMemo(() => {
    if (selectedCompounds.some((c) => c.evidence === "strong")) return "Strong";
    if (selectedCompounds.some((c) => c.evidence === "moderate"))
      return "Moderate";
    return "Emerging";
  }, [selectedCompounds]);

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Eyebrow className="mb-2">Pharmacology tool</Eyebrow>
          <h1 className="font-display text-2xl text-text tracking-tight">
            Cannabis Combo Wheel
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Select cannabinoids and terpenes to see the combined therapeutic profile.
          </p>
        </div>
        <Link href="/clinic/research">
          <Button variant="secondary" size="sm">
            Research console
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Wheel */}
        <Card tone="raised" className="flex items-center justify-center p-8">
          <ComboWheel selected={selected} onToggle={toggle} />
        </Card>

        {/* Results panel */}
        <div className="space-y-5">
          {/* Selected compounds */}
          <Card tone="raised">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <LeafSprig size={14} className="text-accent" />
                Selected Compounds
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCompounds.length === 0 ? (
                <p className="text-sm text-text-muted">
                  Click compounds on the wheel to build your combination.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedCompounds.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggle(c.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-transform hover:scale-105"
                      style={{ backgroundColor: c.color }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-white/60"
                        aria-hidden="true"
                      />
                      {c.name}
                      <span className="text-white/60 ml-0.5">&times;</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedCompounds.length > 0 && (
            <>
              {/* Target symptoms */}
              <Card tone="raised">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Target Symptoms</CardTitle>
                  <CardDescription>
                    Conditions this combination may help with
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {allSymptoms.map(({ name, count }) => (
                      <Badge
                        key={name}
                        tone={count >= 2 ? "success" : "accent"}
                      >
                        {name}
                        {count >= 2 && (
                          <span className="ml-1 text-[10px] opacity-70">
                            {count}x
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[11px] text-text-subtle mt-3">
                    Symptoms with 2x+ have overlapping evidence from multiple
                    compounds in your selection.
                  </p>
                </CardContent>
              </Card>

              {/* Benefits & Risks */}
              <div className="grid grid-cols-2 gap-4">
                <Card tone="raised">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm text-success">
                      Benefits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {allBenefits.map((b) => (
                        <li
                          key={b}
                          className="text-xs text-text-muted flex items-start gap-1.5"
                        >
                          <span className="text-success mt-0.5 shrink-0">
                            +
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card tone="raised">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm text-[color:var(--warning)]">
                      Risks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {allRisks.map((r) => (
                        <li
                          key={r}
                          className="text-xs text-text-muted flex items-start gap-1.5"
                        >
                          <span className="text-[color:var(--warning)] mt-0.5 shrink-0">
                            !
                          </span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Evidence & Notes */}
              <Card tone="raised">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Evidence & Notes</CardTitle>
                    <Badge
                      tone={
                        evidenceLevel === "Strong"
                          ? "success"
                          : evidenceLevel === "Moderate"
                            ? "accent"
                            : "warning"
                      }
                    >
                      {evidenceLevel} evidence
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedCompounds.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <span
                        className="mt-1 h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <div>
                        <p className="text-xs font-medium text-text">
                          {c.name}{" "}
                          <span className="text-text-subtle font-normal">
                            ({c.type})
                          </span>
                        </p>
                        <p className="text-xs text-text-muted leading-relaxed">
                          {c.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
