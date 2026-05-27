/**
 * Click counter / workflow efficiency tracker (EMR-104)
 * ------------------------------------------------------
 * Lightweight in-process counter the chart shell + ops UIs feed with
 * every meaningful interaction. Sits alongside (but is independent of)
 * the AuditLog — AuditLog is the compliance-grade record; this module
 * is the product-analytics one. They share a session id format so a
 * researcher can join the two.
 *
 * Design points:
 *   - Pure functions + a small in-memory store. Persistence is the
 *     caller's job (Audit log + analytics warehouse), so we avoid
 *     prisma imports here and stay easy to unit-test.
 *   - Workflow scoring: each scenario has a "par" click count; clicks
 *     beyond par cost efficiency points.
 *   - Heatmap output is a flat `{ surface -> clicks }` map ready to
 *     hand to the dashboard renderer.
 */

export type WorkflowScenario =
  | "patient_intake"
  | "rx_signature"
  | "claim_submit"
  | "note_signoff"
  | "refill_approval"
  | "message_triage";

export interface ClickEvent {
  sessionId: string;
  /** Stable surface identifier — usually `route#component`. */
  surface: string;
  /** "click" | "key" | "submit" | "scroll" — anything not "passive". */
  kind: "click" | "key" | "submit" | "scroll" | "view";
  /** Optional workflow tag — counts toward that workflow's efficiency score. */
  workflow?: WorkflowScenario;
  occurredAt: Date;
}

export interface WorkflowSummary {
  workflow: WorkflowScenario;
  clicks: number;
  par: number;
  efficiency: number; // 0..1 — 1 means at-or-below par, 0 means runaway
  /** Time from first to last click in this workflow, in seconds. */
  spanSeconds: number;
}

export interface SessionEfficiencyReport {
  sessionId: string;
  totalEvents: number;
  workflows: WorkflowSummary[];
  heatmap: Record<string, number>;
  topSurfaces: Array<{ surface: string; clicks: number }>;
  spanSeconds: number;
}

/** Par values are tuned from prior usability tests; tune via config later. */
export const WORKFLOW_PAR: Record<WorkflowScenario, number> = {
  patient_intake: 18,
  rx_signature: 6,
  claim_submit: 9,
  note_signoff: 7,
  refill_approval: 4,
  message_triage: 5,
};

/**
 * Compute per-workflow efficiency from a sorted list of events.
 *
 * Efficiency is `clamp(par / clicks, 0, 1)` — a session that finishes
 * a workflow in fewer clicks than par scores 1.0 (the floor). Anything
 * over par decays smoothly toward 0.
 */
export function computeWorkflowSummaries(
  events: ClickEvent[],
): WorkflowSummary[] {
  const byWorkflow = new Map<WorkflowScenario, ClickEvent[]>();
  for (const e of events) {
    if (!e.workflow) continue;
    const arr = byWorkflow.get(e.workflow) ?? [];
    arr.push(e);
    byWorkflow.set(e.workflow, arr);
  }

  const out: WorkflowSummary[] = [];
  for (const [workflow, list] of byWorkflow) {
    list.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    const par = WORKFLOW_PAR[workflow];
    const clicks = list.length;
    const span =
      list.length < 2
        ? 0
        : Math.max(
            0,
            Math.floor(
              (list[list.length - 1].occurredAt.getTime() -
                list[0].occurredAt.getTime()) /
                1000,
            ),
          );
    const efficiency = clicks === 0 ? 1 : Math.min(1, par / clicks);
    out.push({
      workflow,
      clicks,
      par,
      efficiency: Number(efficiency.toFixed(3)),
      spanSeconds: span,
    });
  }
  return out.sort((a, b) => a.workflow.localeCompare(b.workflow));
}

export function buildHeatmap(events: ClickEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) {
    if (e.kind === "view") continue;
    out[e.surface] = (out[e.surface] ?? 0) + 1;
  }
  return out;
}

export function summarizeSession(
  sessionId: string,
  events: ClickEvent[],
): SessionEfficiencyReport {
  const own = events.filter((e) => e.sessionId === sessionId);
  if (own.length === 0) {
    return {
      sessionId,
      totalEvents: 0,
      workflows: [],
      heatmap: {},
      topSurfaces: [],
      spanSeconds: 0,
    };
  }
  own.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  const heatmap = buildHeatmap(own);
  const topSurfaces = Object.entries(heatmap)
    .map(([surface, clicks]) => ({ surface, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  const span = Math.max(
    0,
    Math.floor(
      (own[own.length - 1].occurredAt.getTime() - own[0].occurredAt.getTime()) /
        1000,
    ),
  );

  return {
    sessionId,
    totalEvents: own.length,
    workflows: computeWorkflowSummaries(own),
    heatmap,
    topSurfaces,
    spanSeconds: span,
  };
}

export interface AggregateEfficiency {
  workflow: WorkflowScenario;
  sessionCount: number;
  avgClicks: number;
  avgEfficiency: number;
  /** Median seconds spent in the workflow per session. */
  medianSpanSeconds: number;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Roll an array of session reports into per-workflow averages. The
 * dashboard joins this against the `WORKFLOW_PAR` table to highlight
 * workflows that are systematically over par.
 */
export function aggregateAcrossSessions(
  reports: SessionEfficiencyReport[],
): AggregateEfficiency[] {
  const byWorkflow = new Map<WorkflowScenario, WorkflowSummary[]>();
  for (const r of reports) {
    for (const w of r.workflows) {
      const arr = byWorkflow.get(w.workflow) ?? [];
      arr.push(w);
      byWorkflow.set(w.workflow, arr);
    }
  }

  const out: AggregateEfficiency[] = [];
  for (const [workflow, summaries] of byWorkflow) {
    const totalClicks = summaries.reduce((acc, s) => acc + s.clicks, 0);
    const totalEff = summaries.reduce((acc, s) => acc + s.efficiency, 0);
    out.push({
      workflow,
      sessionCount: summaries.length,
      avgClicks: Number((totalClicks / summaries.length).toFixed(2)),
      avgEfficiency: Number((totalEff / summaries.length).toFixed(3)),
      medianSpanSeconds: Math.round(median(summaries.map((s) => s.spanSeconds))),
    });
  }
  return out.sort((a, b) => a.avgEfficiency - b.avgEfficiency);
}

/**
 * In-memory store for use by the chart shell during a request lifecycle.
 * Drop the events into AuditLog at session end — this class never
 * persists on its own.
 */
export class ClickCounter {
  private events: ClickEvent[] = [];

  record(event: Omit<ClickEvent, "occurredAt"> & { occurredAt?: Date }): void {
    this.events.push({
      ...event,
      occurredAt: event.occurredAt ?? new Date(),
    });
  }

  size(): number {
    return this.events.length;
  }

  drain(): ClickEvent[] {
    const out = this.events.slice();
    this.events.length = 0;
    return out;
  }

  snapshot(sessionId: string): SessionEfficiencyReport {
    return summarizeSession(sessionId, this.events);
  }
}
