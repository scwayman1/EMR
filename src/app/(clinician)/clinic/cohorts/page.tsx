import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";
import {
  listOrgMemoryTags,
  getCohortExplorerView,
  MIN_COHORT_SIZE,
} from "@/lib/research/cohort-explorer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cohorts" };

interface CohortsPageProps {
  searchParams: Promise<{ tag?: string; window?: string }>;
}

export default async function CohortsPage({ searchParams }: CohortsPageProps) {
  const user = await requireUser();
  const { tag, window } = await searchParams;

  if (!user.organizationId) {
    return (
      <PageShell maxWidth="max-w-[1100px]">
        <PageHeader
          eyebrow="Cohorts"
          title="Cohort Explorer"
          description="Explore aggregate outcomes across your patient population."
        />
        <EmptyState
          title="No organization linked"
          description="Your account isn't attached to a practice. Ask your practice owner to add you."
        />
      </PageShell>
    );
  }

  const lookbackDays = parseLookbackParam(window);
  const tags = await listOrgMemoryTags(user.organizationId);

  const view = tag
    ? await getCohortExplorerView({
        organizationId: user.organizationId,
        memoryTag: tag,
        lookbackDays,
      })
    : null;

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <PageHeader
        eyebrow="Cohorts"
        title="Cohort Explorer"
        description="Aggregate outcomes across your patient population, segmented by the concerns they're tracking."
      />

      {/* Tag picker */}
      <Card tone="ambient" className="mb-8">
        <CardContent className="py-5">
          {tags.length === 0 ? (
            <p className="text-sm text-text-muted">
              No patient-memory tags in this practice yet. As patients log
              outcomes and the scribe populates memory, cohorts will populate
              here automatically.
            </p>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-wider text-text-subtle mb-3">
                Pick a focus
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const active = t.tag === tag;
                  return (
                    <Link
                      key={t.tag}
                      href={`/clinic/cohorts?tag=${encodeURIComponent(t.tag)}${window ? `&window=${window}` : ""}`}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors",
                        active
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-border bg-surface text-text hover:bg-surface-muted",
                      )}
                    >
                      <span className="font-medium">{t.tag}</span>
                      <span className="text-xs text-text-subtle">
                        {t.patientCount}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!view ? (
        <EmptyState
          title="Pick a focus to explore"
          description="Select a tag above to see the cohort summary — size, age distribution, outcome baselines, and the products they're using."
        />
      ) : view.belowMinCohort ? (
        <Card tone="ambient">
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium text-text mb-1">
              Cohort too small to display
            </p>
            <p className="text-sm text-text-muted">
              Only {view.cohortSize} patient
              {view.cohortSize === 1 ? "" : "s"} match &quot;{view.tag}&quot;.
              We keep cohort summaries hidden until at least {MIN_COHORT_SIZE}{" "}
              patients to protect individual privacy.
            </p>
          </CardContent>
        </Card>
      ) : (
        <CohortSummary view={view} />
      )}
    </PageShell>
  );
}

function parseLookbackParam(raw: string | undefined): number {
  if (!raw) return 90;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0 || n > 3650) return 90;
  return n;
}

function CohortSummary({
  view,
}: {
  view: Awaited<ReturnType<typeof getCohortExplorerView>>;
}) {
  return (
    <div className="space-y-8">
      {/* ── Summary tiles ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Cohort size" value={view.cohortSize.toString()} />
        <StatTile
          label="Median age"
          value={
            view.medianAgeYears != null
              ? `${view.medianAgeYears} yr`
              : "—"
          }
        />
        <StatTile
          label="Active regimens"
          value={view.activeRegimenPatientCount.toString()}
          sub={`of ${view.cohortSize}`}
        />
        <StatTile
          label="On clinician picks"
          value={
            view.clinicianPickUsageRate == null
              ? "—"
              : `${Math.round(view.clinicianPickUsageRate * 100)}%`
          }
          sub="of actively-regimened"
        />
      </div>

      {/* ── Metric baselines ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-text mb-4">
          Outcome baselines
          <span className="text-xs font-normal text-text-subtle ml-2">
            last {view.lookbackDays} days
          </span>
        </h2>
        {view.metricBaselines.length === 0 ? (
          <EmptyState
            title="No outcome logs in the window"
            description="Cohort members haven't logged outcomes in the selected lookback window."
          />
        ) : (
          <div className="space-y-3">
            {view.metricBaselines.map((m) => (
              <MetricBar key={m.metric} metric={m.metric} mean={m.mean} sampleSize={m.sampleSize} />
            ))}
          </div>
        )}
      </section>

      {/* ── Popular products ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-text mb-4">
          What this cohort uses
        </h2>
        {view.popularProducts.length === 0 ? (
          <EmptyState
            title="No linked products"
            description="Cohort members' active regimens aren't yet linked to marketplace products. (CannabisProduct → Product FK bridge, EMR-268.)"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {view.popularProducts.map((row) => (
              <Card key={row.product.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text truncate">
                        {row.product.name}
                      </p>
                      <p className="text-xs text-text-subtle truncate">
                        {row.product.brand}
                      </p>
                    </div>
                    {row.product.clinicianPick && (
                      <Badge tone="accent" className="shrink-0">
                        Pick
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">
                    <span className="text-accent" aria-hidden="true">
                      ◉{" "}
                    </span>
                    {row.regimenCount} of {view.cohortSize} cohort members
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-text-subtle mb-1">
        {label}
      </p>
      <p className="text-2xl font-display text-text tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-text-subtle mt-0.5">{sub}</p>}
    </div>
  );
}

function MetricBar({
  metric,
  mean,
  sampleSize,
}: {
  metric: string;
  mean: number;
  sampleSize: number;
}) {
  // Outcome values are 0-10 in the Leafjourney schema; normalize for the bar.
  const pct = Math.max(0, Math.min(1, mean / 10));
  return (
    <div className="grid grid-cols-[8rem_1fr_4rem] items-center gap-3">
      <span className="text-sm font-medium text-text capitalize">{metric}</span>
      <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
        <div
          className="h-full bg-accent"
          style={{ width: `${pct * 100}%` }}
          aria-hidden="true"
        />
      </div>
      <span className="text-xs text-text-muted tabular-nums text-right">
        {mean.toFixed(1)}{" "}
        <span className="text-text-subtle">({sampleSize})</span>
      </span>
    </div>
  );
}
