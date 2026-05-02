// EMR-185 — Compact above-the-fold patient dashboard.
//
// Patient research called out scrolling fatigue: the home page
// surfaces 9+ cards before the first useful action. This component
// consolidates the four most-asked questions ("when's my next visit?",
// "what am I taking?", "any new labs?", "how am I doing?") into a
// 2x2 grid that fits above the fold on a 14" laptop and a typical
// phone, with everything else collapsed beneath an "expand details"
// disclosure.

import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/ornament";
import { formatDate, formatRelative } from "@/lib/utils/format";

type Visit = {
  id: string;
  scheduledFor: Date | null;
  status: string;
  modality: string | null;
};

type Medication = {
  id: string;
  name: string;
  dosage: string | null;
};

type Lab = {
  id: string;
  name: string;
  resultedAt: Date | null;
  flag: string | null;
};

export interface CompactDashboardProps {
  patientFirstName: string;
  nextVisit: Visit | null;
  activeMedications: Medication[];
  recentLabs: Lab[];
  // 0–100. Drives the ring colour; null hides the score tile content.
  healthScore: number | null;
  // The full-detail dashboard renders below the disclosure when expanded.
  expandedSlot?: React.ReactNode;
}

function HealthRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * circumference;
  const colour =
    clamped >= 80
      ? "var(--accent)"
      : clamped >= 60
        ? "#D4A04E"
        : "#C76A4A";

  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle
          cx={32}
          cy={32}
          r={radius}
          fill="none"
          stroke="var(--surface-muted)"
          strokeWidth={5}
        />
        <circle
          cx={32}
          cy={32}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-base font-semibold tabular-nums text-text">
          {Math.round(clamped)}
        </span>
      </div>
    </div>
  );
}

export function CompactDashboard({
  patientFirstName,
  nextVisit,
  activeMedications,
  recentLabs,
  healthScore,
  expandedSlot,
}: CompactDashboardProps) {
  const visitWhen = nextVisit?.scheduledFor
    ? formatDate(nextVisit.scheduledFor)
    : null;
  const visitRelative = nextVisit?.scheduledFor
    ? formatRelative(nextVisit.scheduledFor)
    : null;
  const flaggedLab = recentLabs.find((l) => l.flag && l.flag !== "normal");
  const latestLab = recentLabs[0];

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <Eyebrow className="mb-2">Today at a glance</Eyebrow>
          <h2 className="font-display text-xl text-text tracking-tight">
            Welcome back, {patientFirstName}.
          </h2>
        </div>
        <Link href="/portal/outcomes">
          <Button size="sm">Quick check-in</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Tile 1: Next appointment */}
        <Link href="/portal/schedule" className="block">
          <Card tone="raised" className="card-hover h-full">
            <CardContent className="py-4 sm:py-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                Next visit
              </p>
              {nextVisit ? (
                <>
                  <p className="font-display text-lg sm:text-xl text-text tracking-tight leading-tight">
                    {visitWhen}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    {visitRelative && (
                      <span className="text-xs text-text-muted">
                        {visitRelative}
                      </span>
                    )}
                    {nextVisit.modality && (
                      <Badge tone="accent" className="text-[10px]">
                        {nextVisit.modality}
                      </Badge>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="font-display text-lg text-text-muted leading-tight">
                    Not scheduled
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Tap to book
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Tile 2: Active meds */}
        <Link href="/portal/medications" className="block">
          <Card tone="raised" className="card-hover h-full">
            <CardContent className="py-4 sm:py-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                Active meds
              </p>
              <p className="font-display text-2xl sm:text-3xl text-text tracking-tight tabular-nums">
                {activeMedications.length}
              </p>
              <p className="text-xs text-text-muted mt-1 truncate">
                {activeMedications.length > 0
                  ? activeMedications
                      .slice(0, 2)
                      .map((m) => m.name)
                      .join(", ")
                  : "Nothing on file"}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Tile 3: Recent labs */}
        <Link href="/portal/labs" className="block">
          <Card tone="raised" className="card-hover h-full">
            <CardContent className="py-4 sm:py-5">
              <div className="flex items-start justify-between gap-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                  Recent labs
                </p>
                {flaggedLab && (
                  <Badge tone="warning" className="text-[10px]">
                    Review
                  </Badge>
                )}
              </div>
              {latestLab ? (
                <>
                  <p className="font-display text-base sm:text-lg text-text tracking-tight leading-tight truncate">
                    {latestLab.name}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {latestLab.resultedAt
                      ? formatRelative(latestLab.resultedAt)
                      : "Pending"}
                  </p>
                </>
              ) : (
                <p className="font-display text-base text-text-muted leading-tight">
                  None yet
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Tile 4: Health score */}
        <Link href="/portal/outcomes" className="block">
          <Card tone="raised" className="card-hover h-full">
            <CardContent className="py-4 sm:py-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                Health score
              </p>
              {healthScore !== null ? (
                <div className="flex items-center gap-3">
                  <HealthRing score={healthScore} />
                  <p className="text-xs text-text-muted leading-snug">
                    {healthScore >= 80
                      ? "Trending strong."
                      : healthScore >= 60
                        ? "Holding steady."
                        : "Let's check in."}
                  </p>
                </div>
              ) : (
                <p className="font-display text-base text-text-muted leading-tight">
                  Log a check-in
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {expandedSlot ? (
        <details className="mt-6 group">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-raised/60 px-4 py-3 hover:bg-surface-raised transition-colors">
            <span className="text-sm font-medium text-text">
              Expand full dashboard
            </span>
            <span className="text-xs text-text-muted group-open:hidden">
              Show
            </span>
            <span className="text-xs text-text-muted hidden group-open:inline">
              Hide
            </span>
          </summary>
          <div className="mt-5">{expandedSlot}</div>
        </details>
      ) : null}
    </div>
  );
}
