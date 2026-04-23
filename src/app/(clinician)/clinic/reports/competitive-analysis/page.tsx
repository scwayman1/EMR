"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import { cn } from "@/lib/utils/cn";

interface FeatureComparison {
  category: string;
  feature: string;
  arfinnMed: string;
  leafjourney: string;
  priority: string;
  notes: string;
}

interface Report {
  title: string;
  generatedAt: string;
  summary: {
    totalFeaturesCompared: number;
    leafjourney: { yes: number; partial: number; no: number };
    arfinnMed: { yes: number; partial: number; no: number };
    leafjourneyScore: number;
    arfinnMedScore: number;
  };
  criticalGaps: { feature: string; category: string; notes: string }[];
  highPriorityGaps: { feature: string; category: string; notes: string }[];
  ourAdvantages: { feature: string; category: string; notes: string }[];
  fullComparison: FeatureComparison[];
  recommendations: string[];
  verdict: string;
}

const STATUS_BADGE: Record<string, { tone: "success" | "warning" | "danger" | "neutral" | "info"; label: string }> = {
  yes: { tone: "success", label: "Yes" },
  partial: { tone: "warning", label: "Partial" },
  no: { tone: "danger", label: "No" },
  planned: { tone: "info", label: "Planned" },
  unknown: { tone: "neutral", label: "Unknown" },
};

export default function CompetitiveAnalysisPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reports/competitive-analysis")
      .then((r) => r.json())
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-text-muted">Generating competitive analysis...</p>
        </div>
      </PageShell>
    );
  }

  if (!report) {
    return (
      <PageShell>
        <p className="text-sm text-danger">Failed to generate report.</p>
      </PageShell>
    );
  }

  const categories = [...new Set(report.fullComparison.map((c) => c.category))];
  const filtered = activeCategory
    ? report.fullComparison.filter((c) => c.category === activeCategory)
    : report.fullComparison;

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Intelligence"
        title="Competitive Analysis"
        description="Feature-by-feature comparison: Leafjourney vs ArfinnMed cannabis EMR"
      />

      {/* Score cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="rounded-2xl shadow-sm border-2 border-accent/30">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-xs text-text-subtle uppercase tracking-wider mb-2">Leafjourney</p>
            <p className="font-display text-5xl text-accent">{report.summary.leafjourneyScore}%</p>
            <p className="text-sm text-text-muted mt-2">
              {report.summary.leafjourney.yes} yes, {report.summary.leafjourney.partial} partial
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-xs text-text-subtle uppercase tracking-wider mb-2">ArfinnMed</p>
            <p className="font-display text-5xl text-text-muted">{report.summary.arfinnMedScore}%</p>
            <p className="text-sm text-text-muted mt-2">
              {report.summary.arfinnMed.yes} yes, {report.summary.arfinnMed.partial} partial
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-xs text-text-subtle uppercase tracking-wider mb-2">Features compared</p>
            <p className="font-display text-5xl text-text">{report.summary.totalFeaturesCompared}</p>
            <p className="text-sm text-text-muted mt-2">
              {report.criticalGaps.length} critical gaps
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical gaps */}
      {report.criticalGaps.length > 0 && (
        <Card className="rounded-2xl shadow-sm border-l-4 border-l-red-500 mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Critical gaps to address</CardTitle>
            <CardDescription>
              Features ArfinnMed offers that we need to build
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.criticalGaps.map((gap, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                  <Badge tone="danger" className="text-[10px] shrink-0 mt-0.5">{gap.category}</Badge>
                  <div>
                    <p className="text-sm font-medium text-text">{gap.feature}</p>
                    <p className="text-xs text-text-muted mt-0.5">{gap.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Our advantages */}
      <Card className="rounded-2xl shadow-sm border-l-4 border-l-emerald-500 mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Our advantages ({report.ourAdvantages.length})</CardTitle>
          <CardDescription>
            Features we have that ArfinnMed does not
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.ourAdvantages.map((adv, i) => (
              <div key={i} className="bg-emerald-50/40 rounded-lg px-4 py-3 border border-emerald-200/50">
                <p className="text-sm font-medium text-text">{adv.feature}</p>
                <p className="text-[11px] text-text-muted mt-0.5">{adv.notes}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="rounded-2xl shadow-sm mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {report.recommendations.map((rec, i) => (
              <p key={i} className="text-sm text-text leading-relaxed">{rec}</p>
            ))}
          </div>
          <div className="mt-6 p-4 bg-accent-soft rounded-xl">
            <p className="text-sm text-text leading-relaxed font-medium">{report.verdict}</p>
          </div>
        </CardContent>
      </Card>

      {/* Category filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
            !activeCategory ? "bg-accent text-white" : "bg-surface-muted text-text-muted hover:bg-border"
          )}
        >
          All ({report.fullComparison.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
            className={cn(
              "text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
              activeCategory === cat ? "bg-accent text-white" : "bg-surface-muted text-text-muted hover:bg-border"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Full comparison table */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-text-subtle border-b-2 border-border">
                  <th className="py-3 pr-4">Feature</th>
                  <th className="py-3 pr-4 text-center">Leafjourney</th>
                  <th className="py-3 pr-4 text-center">ArfinnMed</th>
                  <th className="py-3 pr-4 text-center">Priority</th>
                  <th className="py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const lj = STATUS_BADGE[row.leafjourney] ?? STATUS_BADGE.unknown;
                  const am = STATUS_BADGE[row.arfinnMed] ?? STATUS_BADGE.unknown;
                  const prio = row.priority === "critical" ? "danger" : row.priority === "high" ? "warning" : row.priority === "medium" ? "info" : "neutral";
                  return (
                    <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-surface-muted/50 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-text">{row.feature}</p>
                        <p className="text-[10px] text-text-subtle">{row.category}</p>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <Badge tone={lj.tone} className="text-[10px]">{lj.label}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <Badge tone={am.tone} className="text-[10px]">{am.label}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <Badge tone={prio as any} className="text-[10px] uppercase">{row.priority}</Badge>
                      </td>
                      <td className="py-3 text-xs text-text-muted max-w-xs">{row.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Print */}
      <div className="text-center mt-8 print:hidden">
        <Button variant="secondary" onClick={() => window.print()}>
          Print / save as PDF
        </Button>
      </div>
    </PageShell>
  );
}
