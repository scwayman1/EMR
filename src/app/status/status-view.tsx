"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

type Health = "operational" | "degraded" | "down";

interface Service {
  name: string;
  description: string;
  health: Health;
  uptime30: string;
}

interface Incident {
  id: string;
  date: string;
  title: string;
  resolved: boolean;
  severity: "minor" | "major" | "critical";
  summary: string;
}

interface Maintenance {
  id: string;
  startsAt: string;
  endsAt: string;
  title: string;
  impact: string;
}

const SERVICES: Service[] = [
  { name: "Web app", description: "Patient portal, clinician workspace, operator console", health: "operational", uptime30: "99.98%" },
  { name: "Database", description: "PostgreSQL primary + read replicas", health: "operational", uptime30: "99.99%" },
  { name: "AI agents", description: "Agent fleet (charge integrity, denial triage, patient Q&A)", health: "operational", uptime30: "99.95%" },
  { name: "Payments", description: "Payabli gateway integration", health: "operational", uptime30: "99.91%" },
  { name: "Email", description: "Transactional email (Resend)", health: "operational", uptime30: "99.93%" },
];

const INCIDENTS: Incident[] = [
  {
    id: "inc-0412",
    date: "2026-04-12",
    title: "Elevated latency on analytics queries",
    resolved: true,
    severity: "minor",
    summary: "A long-running analytics query saturated read replicas for ~18 minutes. Affected users saw slower dashboards. Query killed and optimized.",
  },
  {
    id: "inc-0331",
    date: "2026-03-31",
    title: "Payabli webhook delivery delays",
    resolved: true,
    severity: "minor",
    summary: "Payabli's upstream queue backed up; webhook delivery delayed ~45m. No data loss.",
  },
  {
    id: "inc-0318",
    date: "2026-03-18",
    title: "AI agent timeouts",
    resolved: true,
    severity: "major",
    summary: "Model provider upstream had a partial outage. Agents fell back to queued mode; all jobs completed once service resumed.",
  },
];

const MAINTENANCE: Maintenance[] = [
  {
    id: "mx-1",
    startsAt: "2026-04-20 03:00 UTC",
    endsAt: "2026-04-20 03:30 UTC",
    title: "Database minor version upgrade",
    impact: "Read-only mode for ~5 minutes during cutover",
  },
  {
    id: "mx-2",
    startsAt: "2026-05-02 02:00 UTC",
    endsAt: "2026-05-02 04:00 UTC",
    title: "Scheduled retrospective reindex",
    impact: "No user-visible impact expected",
  },
];

const HEALTH_TONE: Record<Health, { dot: string; label: string; tone: "success" | "warning" | "danger" }> = {
  operational: { dot: "bg-accent", label: "Operational", tone: "success" },
  degraded: { dot: "bg-highlight", label: "Degraded", tone: "warning" },
  down: { dot: "bg-danger", label: "Down", tone: "danger" },
};

export function StatusView() {
  const [lastUpdated, setLastUpdated] = useState<string>(() =>
    new Date().toLocaleTimeString()
  );
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setLastUpdated(new Date().toLocaleTimeString());
    }, 60000);
    return () => clearInterval(t);
  }, []);

  const allOk = SERVICES.every((s) => s.health === "operational");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
    setTimeout(() => setSubscribed(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div
        className={cn(
          "rounded-xl p-6 border flex items-center gap-4",
          allOk
            ? "bg-accent-soft border-accent/30"
            : "bg-highlight-soft border-highlight/30"
        )}
      >
        <div
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center shrink-0 text-white text-xl",
            allOk ? "bg-accent" : "bg-highlight"
          )}
        >
          {allOk ? "✓" : "!"}
        </div>
        <div>
          <h1 className="font-display text-2xl text-text">
            {allOk ? "All systems operational" : "Degraded service"}
          </h1>
          <p className="text-sm text-text-muted">
            Last updated {lastUpdated}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>Live status for each component</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {SERVICES.map((s) => {
              const t = HEALTH_TONE[s.health];
              return (
                <div key={s.name} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn("h-2.5 w-2.5 rounded-full", t.dot)} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text">{s.name}</div>
                      <div className="text-xs text-text-muted">{s.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-text-subtle">{s.uptime30} · 30d</span>
                    <Badge tone={t.tone}>{t.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Incident history</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {INCIDENTS.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">
              No incidents in the last 30 days.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {INCIDENTS.map((i) => (
                <div key={i.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text">{i.title}</span>
                        <Badge
                          tone={
                            i.severity === "critical"
                              ? "danger"
                              : i.severity === "major"
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {i.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-muted mt-1">{i.summary}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-text-subtle">{i.date}</span>
                      <Badge tone={i.resolved ? "success" : "warning"}>
                        {i.resolved ? "Resolved" : "Ongoing"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled maintenance</CardTitle>
          <CardDescription>Upcoming planned work</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {MAINTENANCE.map((m) => (
              <div key={m.id} className="py-3">
                <div className="text-sm font-medium text-text">{m.title}</div>
                <div className="text-xs text-text-muted mt-0.5">{m.impact}</div>
                <div className="text-xs text-text-subtle mt-1">
                  {m.startsAt} — {m.endsAt}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card tone="ambient">
        <CardHeader>
          <CardTitle>Subscribe to updates</CardTitle>
          <CardDescription>
            Get an email whenever we open or resolve an incident
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscribed ? (
            <div className="rounded-md border border-accent/30 bg-accent-soft text-accent p-3 text-sm">
              Thanks — you'll get a confirmation email shortly.
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit">Subscribe</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
