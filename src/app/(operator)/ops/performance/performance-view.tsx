"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface SlowEndpoint {
  method: string;
  path: string;
  p95Ms: number;
  rpm: number;
}

interface ErrorEntry {
  id: string;
  timestamp: string;
  route: string;
  message: string;
  stack: string;
}

interface QueryStat {
  query: string;
  p95Ms: number;
  calls: number;
}

interface AgentQueue {
  agent: string;
  depth: number;
  status: "healthy" | "backed-up" | "paused";
}

const SLOW: SlowEndpoint[] = [
  { method: "GET", path: "/api/patients/[id]/chart", p95Ms: 842, rpm: 34 },
  { method: "POST", path: "/api/claims/scrub", p95Ms: 612, rpm: 8 },
  { method: "GET", path: "/api/analytics/population", p95Ms: 540, rpm: 2 },
  { method: "GET", path: "/api/outcomes/timeseries", p95Ms: 411, rpm: 22 },
  { method: "POST", path: "/api/agents/invoke", p95Ms: 392, rpm: 14 },
];

const ERRORS: ErrorEntry[] = Array.from({ length: 20 }, (_, i) => ({
  id: `e-${i}`,
  timestamp: new Date(Date.now() - i * 300000).toISOString().slice(11, 19),
  route:
    ["/api/patients", "/api/claims", "/api/appointments", "/api/outcomes"][i % 4] +
    (i % 3 === 0 ? "/[id]" : ""),
  message:
    i % 4 === 0
      ? "PrismaClientKnownRequestError: Unique constraint failed"
      : i % 4 === 1
      ? "TypeError: Cannot read property 'name' of undefined"
      : i % 4 === 2
      ? "Error: UNAUTHORIZED"
      : "TimeoutError: Query exceeded 2000ms",
  stack: `at handler (src/app/api/.../route.ts:42:13)\n    at wrap (src/lib/mw.ts:22:5)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)`,
}));

const QUERIES: QueryStat[] = [
  { query: "SELECT … FROM patient WHERE org_id = $1", p95Ms: 142, calls: 12450 },
  { query: "SELECT … FROM appointment WHERE provider_id = $1 AND start_at > $2", p95Ms: 88, calls: 4210 },
  { query: "SELECT … FROM claim LEFT JOIN payment …", p95Ms: 312, calls: 880 },
  { query: "UPDATE outcome_log SET …", p95Ms: 41, calls: 2200 },
];

const AGENTS: AgentQueue[] = [
  { agent: "chargeIntegrity", depth: 12, status: "healthy" },
  { agent: "denialTriage", depth: 34, status: "backed-up" },
  { agent: "patientExplanation", depth: 3, status: "healthy" },
  { agent: "aging", depth: 0, status: "paused" },
  { agent: "reconciliation", depth: 8, status: "healthy" },
];

function buildSeries(seed: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 24; i++) {
    const hour = (i + new Date().getHours()) % 24;
    const base = 150 + Math.sin((hour / 24) * Math.PI * 2) * 50;
    pts.push(Math.max(40, Math.round(base + Math.sin(seed + i) * 40 + Math.random() * 30)));
  }
  return pts;
}

export function PerformanceView() {
  const [tick, setTick] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 10000);
    return () => clearInterval(t);
  }, []);

  const liveStats = useMemo(() => {
    const active = 40 + Math.floor(Math.random() * 30);
    const avg = 180 + Math.floor(Math.random() * 80);
    const err = +(Math.random() * 1.2).toFixed(2);
    return { active, avg, err };
  }, [tick]);

  const series = useMemo(() => buildSeries(tick), [tick]);
  const maxVal = Math.max(...series);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard label="Active requests" value={`${liveStats.active}`} hint="right now" />
        <StatCard
          label="Avg response time"
          value={`${liveStats.avg}ms`}
          hint="p50 last 60s"
        />
        <StatCard
          label="Error rate"
          value={`${liveStats.err}%`}
          hint="last 5 min"
          tone={liveStats.err > 1 ? "danger" : "success"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Response times · last 24h</CardTitle>
          <CardDescription>ms, per hour. Auto-refresh: 10s</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-40">
            {series.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-accent/80"
                style={{ height: `${(v / maxVal) * 100}%` }}
                title={`${v}ms`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-text-subtle mt-2">
            <span>-24h</span>
            <span>-12h</span>
            <span>now</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Slowest endpoints</CardTitle>
            <CardDescription>Sorted by p95 response time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {SLOW.map((e) => (
                <div
                  key={e.path}
                  className="py-2.5 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <Badge tone="info">{e.method}</Badge>{" "}
                    <code className="font-mono text-text text-xs">{e.path}</code>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-text-muted">{e.rpm} rpm</span>
                    <Badge tone={e.p95Ms > 600 ? "warning" : "neutral"}>
                      {e.p95Ms}ms
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent queue depth</CardTitle>
            <CardDescription>Jobs waiting per agent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {AGENTS.map((a) => (
                <div
                  key={a.agent}
                  className="py-2.5 flex items-center justify-between gap-3 text-sm"
                >
                  <span className="font-mono text-text text-xs">{a.agent}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">{a.depth} jobs</span>
                    <Badge
                      tone={
                        a.status === "healthy"
                          ? "success"
                          : a.status === "backed-up"
                          ? "warning"
                          : "neutral"
                      }
                    >
                      {a.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database query performance</CardTitle>
          <CardDescription>Slowest queries by p95</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {QUERIES.map((q, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <code className="font-mono text-text text-xs truncate max-w-[60%]">
                  {q.query}
                </code>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-text-muted">{q.calls.toLocaleString()} calls</span>
                  <Badge tone={q.p95Ms > 200 ? "warning" : "neutral"}>{q.p95Ms}ms</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent errors</CardTitle>
          <CardDescription>Last {ERRORS.length} errors across all routes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {ERRORS.map((err) => (
              <div key={err.id} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-[11px] font-mono text-text-subtle">
                      {err.timestamp}
                    </span>
                    <code className="text-xs font-mono text-text-muted">{err.route}</code>
                    <span className="text-sm text-text truncate">{err.message}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpanded(expanded === err.id ? null : err.id)
                    }
                  >
                    {expanded === err.id ? "Hide" : "Stack"}
                  </Button>
                </div>
                {expanded === err.id && (
                  <pre className="mt-2 bg-neutral-900 text-neutral-100 text-xs font-mono rounded p-3 overflow-x-auto">
                    {err.stack}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "success" | "danger";
}) {
  return (
    <Card tone="raised">
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
        <div
          className={cn(
            "font-display text-3xl mt-1",
            tone === "danger" ? "text-danger" : tone === "success" ? "text-accent" : "text-text"
          )}
        >
          {value}
        </div>
        <div className="text-xs text-text-subtle mt-1">{hint}</div>
      </CardContent>
    </Card>
  );
}
