// EMR-147 — Modular EMR licensing (Michelin-style brochure).
//
// Operator-facing licensing surface. Renders the cross-tier comparison
// matrix, the Michelin-style course menu, and links the print-ready
// brochure HTML which can be exported to PDF for sales handoff.

import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  brochureStats,
  buildComparisonMatrix,
  type CellKind,
} from "@/lib/platform/licensing";
import { MENU_VERSION, menuCourses } from "@/lib/platform/licensing-menu";

export const metadata = { title: "Licensing" };

const STARS = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, 3 - n));

const CELL_TONES: Record<CellKind, string> = {
  included: "bg-accent-soft text-accent font-medium",
  addon: "bg-highlight-soft/40 text-[color:var(--highlight-hover)]",
  roadmap: "bg-surface-muted text-text-subtle italic",
  unavailable: "text-text-subtle/50",
};

export default async function OpsLicensingPage() {
  await requireUser();
  const matrix = buildComparisonMatrix();
  const stats = brochureStats();
  const courses = menuCourses();

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow={`Edition ${MENU_VERSION}`}
        title="Licensing menu"
        description="Modular EMR catalog with tier pricing, à-la-carte rates, and a Michelin-style course narrative. Export the brochure for prospect handoff."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/api/platform/licensing/menu.html"
              target="_blank"
              prefetch={false}
            >
              <Button variant="secondary">Open brochure (HTML)</Button>
            </Link>
            <Link
              href="/api/platform/licensing/menu.json"
              target="_blank"
              prefetch={false}
            >
              <Button variant="ghost">Raw JSON</Button>
            </Link>
            <Link href="/licensing" target="_blank" prefetch={false}>
              <Button>Public menu</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatTile label="Modules" value={stats.modulesTotal} />
        <StatTile label="Three-star (GA)" value={stats.modulesGa} />
        <StatTile label="In pilot" value={stats.modulesPreviewOrBeta} />
        <StatTile label="AI agents" value={stats.totalAgents} />
      </div>

      <section className="mb-10">
        <h2 className="font-display text-xl tracking-tight mb-3">Tiers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {matrix.tiers.map((t) => (
            <Card key={t.id} tone="raised">
              <CardHeader>
                <CardTitle className="text-base">{t.label}</CardTitle>
                <CardDescription>{t.blurb}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-text">
                  {t.monthlyLabel}
                </p>
                <p className="text-[12px] text-text-muted mt-2 leading-relaxed">
                  {t.bestFor}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-display text-xl tracking-tight mb-3">
          Feature comparison
        </h2>
        <Card>
          <CardContent className="pt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="font-medium text-text-subtle pb-2 pr-4 w-[34%]">
                    Module
                  </th>
                  {matrix.tiers.map((t) => (
                    <th
                      key={t.id}
                      className="font-medium text-text-subtle pb-2 px-2 text-center"
                    >
                      {t.label}
                    </th>
                  ))}
                  <th className="font-medium text-text-subtle pb-2 pl-2 text-right">
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
                      tierIds={matrix.tiers.map((t) => t.id)}
                    />
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="font-display text-xl tracking-tight mb-3">
          Course menu
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Michelin-style — three stars: production ready, two stars:
          battle-tested in pilots, one star: preview.
        </p>
        {courses.map((course) => (
          <div key={course.pillar} className="mb-6">
            <header className="mb-2">
              <h3 className="font-display text-lg tracking-tight">
                {course.pillarLabel}
              </h3>
              <p className="italic text-text-muted text-sm">{course.blurb}</p>
            </header>
            <div className="space-y-2">
              {course.modules.map((m) => (
                <div
                  key={m.id}
                  className="border border-border bg-surface rounded-lg px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">
                        {m.name}
                        <span
                          className="text-[color:var(--highlight-hover)] ml-2"
                          title={m.starsLabel}
                        >
                          {STARS(m.stars)}
                        </span>
                      </p>
                      <p className="text-[12px] italic text-text-muted">
                        {m.tagline}
                      </p>
                    </div>
                    <Badge tone="neutral">{m.priceDisplay}</Badge>
                  </div>
                  <p className="text-[13px] text-text-muted mt-1.5 leading-relaxed">
                    {m.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </PageShell>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card tone="raised">
      <CardContent className="py-4">
        <p className="font-display text-2xl tabular-nums text-text">{value}</p>
        <p className="text-[11px] uppercase tracking-wider text-text-subtle">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}

function PillarRows({
  pillar,
  tierIds,
}: {
  pillar: ReturnType<typeof buildComparisonMatrix>["rowsByPillar"][number];
  tierIds: ReadonlyArray<"starter" | "professional" | "canopy" | "enterprise">;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={tierIds.length + 2}
          className="pt-4 pb-1 text-[11px] uppercase tracking-wider text-text-subtle"
        >
          {pillar.pillarLabel}
        </td>
      </tr>
      {pillar.rows.map((r) => (
        <tr key={r.module.id} className="border-t border-border/60">
          <td className="py-2 pr-4">
            <p className="font-medium text-text">
              {r.module.name}
              <span
                className="text-[color:var(--highlight-hover)] ml-2"
                title={r.starsLabel}
              >
                {STARS(r.stars)}
              </span>
            </p>
            <p className="text-[11px] italic text-text-muted">
              {r.module.tagline}
            </p>
          </td>
          {tierIds.map((tid) => {
            const cell = r.cells[tid];
            return (
              <td
                key={tid}
                className={cn(
                  "py-2 px-2 text-center text-[12px] rounded",
                  CELL_TONES[cell.kind],
                )}
              >
                {cell.label}
              </td>
            );
          })}
          <td className="py-2 pl-2 text-right text-[12px] text-text-muted">
            {r.priceDisplay}
          </td>
        </tr>
      ))}
    </>
  );
}
