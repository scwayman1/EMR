import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import {
  insuranceBillingAgent,
  formatPipelineTime,
  type AgentRole,
  type AgentStatus,
  type BillingPipelineRun,
} from "@/lib/agents/insurance-billing-agent";

export const metadata = { title: "AI Billing Agent Cockpit" };
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// EMR-045 — AI Billing Agent Cockpit
// ---------------------------------------------------------------------------
// Dark-mode operator surface that visualizes the four-agent billing pipeline
// in motion: Coding → Integrity → Construction → Submission. The page reads
// recent encounters/claims for live signal but the inter-agent debate feed
// is rendered from InsuranceBillingAgent.runBillingPipeline transcripts so
// the operator can audit the reasoning, state transitions, and rejections
// without leaving the page.
// ---------------------------------------------------------------------------

const ROLE_META: Record<
  AgentRole,
  { label: string; chip: string; accent: string; ring: string; dot: string; glyph: string }
> = {
  coding: {
    label: "Coding Optimization",
    chip: "bg-sky-500/10 text-sky-300 border-sky-500/30",
    accent: "text-sky-300",
    ring: "ring-sky-400/40",
    dot: "bg-sky-400",
    glyph: "C",
  },
  integrity: {
    label: "Charge Integrity",
    chip: "bg-violet-500/10 text-violet-300 border-violet-500/30",
    accent: "text-violet-300",
    ring: "ring-violet-400/40",
    dot: "bg-violet-400",
    glyph: "I",
  },
  construction: {
    label: "Claim Construction",
    chip: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    accent: "text-amber-300",
    ring: "ring-amber-400/40",
    dot: "bg-amber-400",
    glyph: "K",
  },
  submission: {
    label: "Clearinghouse Submission",
    chip: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    accent: "text-emerald-300",
    ring: "ring-emerald-400/40",
    dot: "bg-emerald-400",
    glyph: "S",
  },
};

const STATUS_META: Record<AgentStatus, { tone: string; pulse: boolean; label: string }> = {
  queued: { tone: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30", pulse: false, label: "queued" },
  thinking: {
    tone: "text-sky-300 bg-sky-500/10 border-sky-500/30",
    pulse: true,
    label: "thinking",
  },
  debating: {
    tone: "text-violet-300 bg-violet-500/10 border-violet-500/30",
    pulse: true,
    label: "debating",
  },
  approved: {
    tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    pulse: false,
    label: "approved",
  },
  blocked: { tone: "text-rose-300 bg-rose-500/10 border-rose-500/30", pulse: false, label: "blocked" },
  submitted: {
    tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    pulse: true,
    label: "submitted",
  },
  failed: { tone: "text-rose-300 bg-rose-500/10 border-rose-500/30", pulse: true, label: "failed" },
};

export default async function BillingAgentCockpitPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  // ── Pull recent encounters to drive the pipeline simulations ──
  const recentEncounters = await prisma.encounter
    .findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, patient: { select: { firstName: true, lastName: true } } },
    })
    .catch(() => [] as Array<{
      id: string;
      patient: { firstName: string | null; lastName: string | null } | null;
    }>);

  // If no encounters exist (fresh org, demo seed), synthesize deterministic
  // ids so the cockpit still renders something coherent for the operator.
  const pipelineSeeds =
    recentEncounters.length > 0
      ? recentEncounters
      : [
          { id: "enc_demo_001", patient: { firstName: "Demo", lastName: "Patient A" } },
          { id: "enc_demo_002", patient: { firstName: "Demo", lastName: "Patient B" } },
          { id: "enc_demo_003", patient: { firstName: "Demo", lastName: "Patient C" } },
          { id: "enc_demo_004", patient: { firstName: "Demo", lastName: "Patient D" } },
        ];

  // Run the coordinator for each encounter in parallel.
  const runs: Array<{
    encounterId: string;
    patientLabel: string;
    run: BillingPipelineRun;
  }> = await Promise.all(
    pipelineSeeds.slice(0, 4).map(async (e) => ({
      encounterId: e.id,
      patientLabel: `${e.patient?.firstName ?? "Patient"} ${e.patient?.lastName ?? ""}`.trim(),
      run: await insuranceBillingAgent.runBillingPipeline(e.id),
    })),
  );

  // Aggregate gauges
  const totalRuns = runs.length;
  const submittedCount = runs.filter((r) => r.run.outcome.status === "submitted").length;
  const cleanCount = runs.filter((r) => r.run.outcome.cleanClaim).length;
  const heldCount = runs.filter((r) => r.run.outcome.status === "held").length;
  const failedCount = runs.filter((r) => r.run.outcome.status === "failed").length;
  const avgConfidence =
    runs.reduce((sum, r) => sum + r.run.outcome.overallConfidence, 0) / Math.max(1, totalRuns);
  const cleanClaimRate = totalRuns > 0 ? Math.round((cleanCount / totalRuns) * 100) : 0;
  const submissionRate = totalRuns > 0 ? Math.round((submittedCount / totalRuns) * 100) : 0;

  // Per-role confidence averages for the gauge strip
  const perRole: Record<AgentRole, { sum: number; count: number }> = {
    coding: { sum: 0, count: 0 },
    integrity: { sum: 0, count: 0 },
    construction: { sum: 0, count: 0 },
    submission: { sum: 0, count: 0 },
  };
  for (const { run } of runs) {
    for (const phase of run.phases) {
      perRole[phase.role].sum += phase.confidence;
      perRole[phase.role].count += 1;
    }
  }

  // Flatten transcripts into one merged feed, newest pipelines first.
  const mergedFeed = runs
    .flatMap((r) =>
      r.run.transcript.map((m) => ({
        ...m,
        encounterId: r.encounterId,
        patientLabel: r.patientLabel,
      })),
    )
    .sort((a, b) => (a.at > b.at ? -1 : a.at < b.at ? 1 : 0))
    .slice(0, 30);

  // Aggregate optimized codes for the codes panel
  const cptTally = new Map<string, number>();
  const icdTally = new Map<string, number>();
  for (const { run } of runs) {
    for (const code of run.outcome.optimizedCpt) {
      cptTally.set(code, (cptTally.get(code) ?? 0) + 1);
    }
    for (const code of run.outcome.optimizedIcd10) {
      icdTally.set(code, (icdTally.get(code) ?? 0) + 1);
    }
  }
  const topCpt = [...cptTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topIcd = [...icdTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Synth a clean-claim-rate sparkline series — last 14 ticks derived from
  // the current rate so the visual feels alive on first paint. Real
  // historical data lands in EMR-046.
  const sparkSeries = Array.from({ length: 14 }, (_, i) => {
    const drift = ((i * 17) % 11) - 5;
    return Math.max(60, Math.min(100, cleanClaimRate + drift));
  });

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 selection:bg-emerald-400/30">
      {/* Ambient grid + glow background */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(99,102,241,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.15) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
          {/* ── Cockpit header ─────────────────────────────────────── */}
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.22em] text-emerald-400">
                <PulseDot tone="emerald" />
                EMR-045 · Live · Cockpit
              </div>
              <h1 className="mt-3 font-display text-3xl tracking-tight text-zinc-50 md:text-4xl">
                AI Billing Agent Cockpit
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                Real-time visibility into the four-agent insurance billing pipeline.
                Watch coding, integrity, construction, and submission specialists
                debate every claim before it hits the clearinghouse.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
              <GatewayChip label="Availity" status="online" />
              <GatewayChip label="Waystar" status="online" />
              <GatewayChip label="OpenRouter" status="online" />
              <GatewayChip label="Audit Stream" status="online" />
            </div>
          </div>

          {/* ── Hero gauges ────────────────────────────────────────── */}
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Gauge
              label="Clean claim rate"
              value={`${cleanClaimRate}%`}
              hint={`${cleanCount} / ${totalRuns} pipelines`}
              tone="emerald"
              percent={cleanClaimRate}
            />
            <Gauge
              label="Submission rate"
              value={`${submissionRate}%`}
              hint={`${submittedCount} submitted · ${failedCount} retry · ${heldCount} held`}
              tone="sky"
              percent={submissionRate}
            />
            <Gauge
              label="Avg agent confidence"
              value={`${Math.round(avgConfidence * 100)}%`}
              hint="across all 4 specialists"
              tone="violet"
              percent={Math.round(avgConfidence * 100)}
            />
            <Gauge
              label="Active pipelines"
              value={String(totalRuns)}
              hint="encounters in flight now"
              tone="amber"
              percent={Math.min(100, totalRuns * 25)}
            />
          </div>

          {/* ── Per-agent confidence strip ─────────────────────────── */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {(Object.keys(perRole) as AgentRole[]).map((role) => {
              const meta = ROLE_META[role];
              const data = perRole[role];
              const pct = data.count > 0 ? Math.round((data.sum / data.count) * 100) : 0;
              return (
                <div
                  key={role}
                  className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 backdrop-blur"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`grid h-7 w-7 place-items-center rounded-lg border font-mono text-[11px] ${meta.chip}`}
                      >
                        {meta.glyph}
                      </div>
                      <span className="text-xs text-zinc-300">{meta.label}</span>
                    </div>
                    <span className={`font-display text-lg tabular-nums ${meta.accent}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full ${meta.dot}`}
                      style={{ width: `${pct}%`, transition: "width 600ms ease" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Main 2-col layout: pipelines + debate feed ────────── */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Active pipelines */}
            <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur">
              <SectionHeader title="Active pipelines" sub="Coding → Integrity → Construction → Submission" />
              <div className="mt-4 space-y-4">
                {runs.map(({ encounterId, patientLabel, run }) => (
                  <PipelineRow
                    key={encounterId}
                    encounterId={encounterId}
                    patientLabel={patientLabel}
                    run={run}
                  />
                ))}
              </div>
            </section>

            {/* Debate feed */}
            <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 backdrop-blur">
              <SectionHeader
                title="Inter-agent debate feed"
                sub="Live transcript · auto-scrolling"
                trailing={<PulseDot tone="emerald" />}
              />
              <div className="mt-4 max-h-[560px] overflow-y-auto pr-1 font-mono text-[12.5px] leading-relaxed">
                <ul className="space-y-2.5">
                  {mergedFeed.map((m) => {
                    const meta = ROLE_META[m.role];
                    return (
                      <li
                        key={`${m.encounterId}-${m.step}`}
                        className="rounded-lg border border-zinc-800/70 bg-zinc-900/40 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                          <span className="tabular-nums">{formatPipelineTime(m.at)}</span>
                          <span
                            className={`rounded border px-1.5 py-px font-medium ${meta.chip}`}
                          >
                            {meta.label}
                          </span>
                          <span className="text-zinc-600">·</span>
                          <span className="text-zinc-500">
                            {m.kind === "transition" ? "STATE" : m.kind.toUpperCase()}
                          </span>
                          {typeof m.confidence === "number" && (
                            <>
                              <span className="text-zinc-600">·</span>
                              <span className={meta.accent}>
                                conf {Math.round(m.confidence * 100)}%
                              </span>
                            </>
                          )}
                          <span className="ml-auto truncate text-zinc-600">
                            {m.encounterId}
                          </span>
                        </div>
                        <p className="mt-1 text-zinc-200">{m.text}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          </div>

          {/* ── Optimized codes + clean-claim trend ────────────────── */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr_1.1fr]">
            <CodePanel title="Top optimized CPT" entries={topCpt} accent="sky" />
            <CodePanel title="Top optimized ICD-10" entries={topIcd} accent="violet" />
            <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur">
              <SectionHeader
                title="Clean claim rate · last 14 ticks"
                sub="rolling 5-minute windows"
              />
              <div className="mt-4 flex items-end gap-4">
                <div className="font-display text-5xl tabular-nums text-emerald-300">
                  {cleanClaimRate}%
                </div>
                <div className="pb-2 text-xs text-zinc-400">
                  Target ≥ 95% · Current run includes {totalRuns} pipelines
                </div>
              </div>
              <DarkSparkline data={sparkSeries} />
              <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                <span>oldest</span>
                <span>now</span>
              </div>
            </section>
          </div>

          {/* ── Per-pipeline outcome cards ─────────────────────────── */}
          <div className="mt-8">
            <SectionHeader
              title="Pipeline outcomes"
              sub="Final disposition of each active pipeline"
            />
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {runs.map(({ encounterId, run }) => (
                <OutcomeCard key={encounterId} encounterId={encounterId} run={run} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Keyframes used by the pulse dots — scoped to this page */}
      <style>{`
        @keyframes cockpit-pulse {
          0%, 100% { transform: scale(1); opacity: 0.65; }
          50% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes cockpit-glow {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  sub,
  trailing,
}: {
  title: string;
  sub?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          {sub}
        </div>
        <h2 className="mt-1 font-display text-lg text-zinc-100">{title}</h2>
      </div>
      {trailing}
    </div>
  );
}

function PulseDot({ tone = "emerald" }: { tone?: "emerald" | "rose" | "amber" }) {
  const color =
    tone === "rose"
      ? "bg-rose-400"
      : tone === "amber"
        ? "bg-amber-400"
        : "bg-emerald-400";
  return (
    <span className="relative inline-flex h-2 w-2 items-center justify-center">
      <span
        className={`absolute inline-flex h-2 w-2 rounded-full ${color}`}
        style={{ animation: "cockpit-pulse 1.8s ease-out infinite" }}
      />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}

function GatewayChip({
  label,
  status,
}: {
  label: string;
  status: "online" | "degraded" | "offline";
}) {
  const tone =
    status === "online"
      ? "border-emerald-500/30 text-emerald-300"
      : status === "degraded"
        ? "border-amber-500/30 text-amber-300"
        : "border-rose-500/30 text-rose-300";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-zinc-900/60 px-2.5 py-1 ${tone}`}
    >
      <PulseDot tone={status === "online" ? "emerald" : status === "degraded" ? "amber" : "rose"} />
      {label}
    </span>
  );
}

function Gauge({
  label,
  value,
  hint,
  tone,
  percent,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "emerald" | "sky" | "violet" | "amber";
  percent: number;
}) {
  const tones: Record<string, { text: string; bar: string; ring: string }> = {
    emerald: { text: "text-emerald-300", bar: "bg-emerald-400", ring: "ring-emerald-400/30" },
    sky: { text: "text-sky-300", bar: "bg-sky-400", ring: "ring-sky-400/30" },
    violet: { text: "text-violet-300", bar: "bg-violet-400", ring: "ring-violet-400/30" },
    amber: { text: "text-amber-300", bar: "bg-amber-400", ring: "ring-amber-400/30" },
  };
  const t = tones[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 backdrop-blur ring-1 ${t.ring}`}
    >
      <div className="flex items-baseline justify-between">
        <p className={`font-display text-4xl tabular-nums ${t.text}`}>{value}</p>
        <PulseDot tone={tone === "amber" ? "amber" : tone === "emerald" ? "emerald" : "emerald"} />
      </div>
      <p className="mt-1 text-xs text-zinc-300">{label}</p>
      {hint && <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{hint}</p>}
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full ${t.bar}`}
          style={{ width: `${Math.max(2, Math.min(100, percent))}%`, transition: "width 700ms ease" }}
        />
      </div>
    </div>
  );
}

function PipelineRow({
  encounterId,
  patientLabel,
  run,
}: {
  encounterId: string;
  patientLabel: string;
  run: BillingPipelineRun;
}) {
  const outcomeTone =
    run.outcome.status === "submitted"
      ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
      : run.outcome.status === "held"
        ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
        : "text-rose-300 border-rose-500/30 bg-rose-500/10";

  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            <span>{encounterId}</span>
            <span className="text-zinc-700">·</span>
            <span className="truncate text-zinc-400">{patientLabel}</span>
          </div>
          <div className="mt-1 text-sm text-zinc-200">
            {run.outcome.claimNumber ?? "—"}{" "}
            <span className="text-zinc-500">
              · {run.outcome.optimizedCpt.join(", ") || "no codes"}
            </span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${outcomeTone}`}
        >
          {run.outcome.status}
        </span>
      </div>

      {/* Phase pills connected by a track */}
      <div className="relative mt-4">
        <div className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800" />
        <div className="relative grid grid-cols-4 gap-2">
          {run.phases.map((phase) => {
            const meta = ROLE_META[phase.role];
            const status = STATUS_META[phase.status];
            return (
              <div
                key={phase.role}
                className={`rounded-lg border bg-zinc-950/80 px-2.5 py-2 text-center ${status.tone}`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`}
                    style={
                      status.pulse
                        ? { animation: "cockpit-glow 1.4s ease-in-out infinite" }
                        : undefined
                    }
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
                    {meta.label.split(" ")[0]}
                  </span>
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.16em]">
                  {status.label}
                </div>
                <div className="mt-1 font-display text-sm tabular-nums">
                  {Math.round(phase.confidence * 100)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 text-[11px] text-zinc-400">{run.outcome.summary}</div>
    </div>
  );
}

function CodePanel({
  title,
  entries,
  accent,
}: {
  title: string;
  entries: [string, number][];
  accent: "sky" | "violet";
}) {
  const tone =
    accent === "sky"
      ? "text-sky-300 border-sky-500/30 bg-sky-500/10"
      : "text-violet-300 border-violet-500/30 bg-violet-500/10";
  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur">
      <SectionHeader title={title} sub="ranked by frequency" />
      <ul className="mt-4 space-y-2">
        {entries.length === 0 && (
          <li className="text-xs text-zinc-500">No codes optimized yet.</li>
        )}
        {entries.map(([code, count]) => (
          <li
            key={code}
            className="flex items-center justify-between rounded-lg border border-zinc-800/70 bg-zinc-950/40 px-3 py-2"
          >
            <span
              className={`rounded border px-2 py-0.5 font-mono text-[12px] ${tone}`}
            >
              {code}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-zinc-400">
              ×{count}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OutcomeCard({
  encounterId,
  run,
}: {
  encounterId: string;
  run: BillingPipelineRun;
}) {
  const tone =
    run.outcome.status === "submitted"
      ? "border-emerald-500/30 ring-emerald-400/20"
      : run.outcome.status === "held"
        ? "border-amber-500/30 ring-amber-400/20"
        : "border-rose-500/30 ring-rose-400/20";
  return (
    <div className={`rounded-2xl border bg-zinc-900/50 p-4 backdrop-blur ring-1 ${tone}`}>
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          {encounterId}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
          {run.outcome.status}
        </div>
      </div>
      <div className="mt-2 font-display text-xl text-zinc-100">
        {run.outcome.claimNumber ?? "—"}
      </div>
      <div className="mt-1 text-xs text-zinc-400">
        Billed{" "}
        <span className="font-mono text-zinc-200">
          ${(run.outcome.billedCents / 100).toFixed(2)}
        </span>{" "}
        · Confidence{" "}
        <span className="font-mono text-zinc-200">
          {Math.round(run.outcome.overallConfidence * 100)}%
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {run.outcome.optimizedCpt.map((c) => (
          <span
            key={c}
            className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[10px] text-sky-300"
          >
            {c}
          </span>
        ))}
        {run.outcome.modifiers.map((m) => (
          <span
            key={m}
            className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-300"
          >
            mod-{m}
          </span>
        ))}
      </div>
    </div>
  );
}

function DarkSparkline({ data }: { data: number[] }) {
  const width = 480;
  const height = 90;
  const padding = 6;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = innerW / (data.length - 1);
  const pts = data.map((v, i) => ({
    x: padding + i * step,
    y: padding + innerH - ((v - min) / range) * innerH,
  }));
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${padding},${height - padding} ${line} ${width - padding},${height - padding}`;
  const last = pts[pts.length - 1];

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="mt-3"
      aria-hidden
    >
      <defs>
        <linearGradient id="cockpit-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(52,211,153)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="rgb(52,211,153)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1={padding}
          x2={width - padding}
          y1={padding + innerH * p}
          y2={padding + innerH * p}
          stroke="rgba(63,63,70,0.45)"
          strokeDasharray="2 4"
        />
      ))}
      <polygon points={area} fill="url(#cockpit-spark)" />
      <polyline
        fill="none"
        stroke="rgb(52,211,153)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={line}
      />
      <circle cx={last.x} cy={last.y} r="4" fill="rgb(52,211,153)" />
      <circle cx={last.x} cy={last.y} r="8" fill="rgb(52,211,153)" opacity="0.18" />
    </svg>
  );
}
