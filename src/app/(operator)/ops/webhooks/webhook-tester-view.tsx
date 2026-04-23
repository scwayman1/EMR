"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

interface Endpoint {
  path: string;
  source: "clerk" | "payabli";
  description: string;
}

interface WebhookEvent {
  id: string;
  timestamp: string;
  source: "clerk" | "payabli";
  eventType: string;
  status: "success" | "failed";
  payload: Record<string, unknown>;
}

const ENDPOINTS: Endpoint[] = [
  {
    path: "/api/webhooks/clerk",
    source: "clerk",
    description: "User lifecycle events (user.created, user.updated, session.created)",
  },
  {
    path: "/api/webhooks/payabli",
    source: "payabli",
    description: "Payment events (transaction.approved, settlement.created, refund.issued)",
  },
];

const EVENTS: WebhookEvent[] = [
  {
    id: "evt_01",
    timestamp: "2026-04-16 10:52:04",
    source: "clerk",
    eventType: "user.created",
    status: "success",
    payload: {
      type: "user.created",
      data: { id: "user_2abc", email_addresses: [{ email_address: "new@patient.com" }] },
    },
  },
  {
    id: "evt_02",
    timestamp: "2026-04-16 10:41:33",
    source: "payabli",
    eventType: "transaction.approved",
    status: "success",
    payload: { id: "txn_1903", amount: 18500, currency: "USD", status: "approved" },
  },
  {
    id: "evt_03",
    timestamp: "2026-04-16 10:12:02",
    source: "payabli",
    eventType: "transaction.declined",
    status: "failed",
    payload: { id: "txn_1902", amount: 4200, reason: "insufficient_funds" },
  },
  {
    id: "evt_04",
    timestamp: "2026-04-16 09:58:11",
    source: "clerk",
    eventType: "session.created",
    status: "success",
    payload: { type: "session.created", data: { user_id: "user_2abc" } },
  },
  {
    id: "evt_05",
    timestamp: "2026-04-16 09:40:22",
    source: "payabli",
    eventType: "settlement.created",
    status: "success",
    payload: { id: "stl_441", batch_total: 482750, count: 31 },
  },
  {
    id: "evt_06",
    timestamp: "2026-04-16 09:02:45",
    source: "clerk",
    eventType: "user.updated",
    status: "success",
    payload: { type: "user.updated", data: { id: "user_21de" } },
  },
  {
    id: "evt_07",
    timestamp: "2026-04-16 08:22:10",
    source: "payabli",
    eventType: "refund.issued",
    status: "success",
    payload: { id: "rf_0088", original_txn: "txn_1870", amount: 2000 },
  },
  {
    id: "evt_08",
    timestamp: "2026-04-16 07:55:01",
    source: "clerk",
    eventType: "user.deleted",
    status: "failed",
    payload: { type: "user.deleted", error: "signature_verification_failed" },
  },
];

export function WebhookTesterView() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [events, setEvents] = useState<WebhookEvent[]>(EVENTS);
  const [filter, setFilter] = useState<"all" | "clerk" | "payabli">("all");

  const handleReplay = (evt: WebhookEvent) => {
    const replayed: WebhookEvent = {
      ...evt,
      id: `evt_replay_${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
      status: "success",
    };
    setEvents([replayed, ...events]);
  };

  const handleTest = (ep: Endpoint) => {
    const mock: WebhookEvent = {
      id: `evt_test_${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
      source: ep.source,
      eventType: ep.source === "clerk" ? "test.ping" : "test.transaction",
      status: "success",
      payload: { test: true, note: "Fired from webhook harness", endpoint: ep.path },
    };
    setEvents([mock, ...events]);
  };

  const filtered = filter === "all" ? events : events.filter((e) => e.source === filter);

  return (
    <div className="space-y-6">
      <Card tone="raised">
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
          <CardDescription>Active webhook receivers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ENDPOINTS.map((ep) => (
              <div
                key={ep.path}
                className="rounded-lg border border-border bg-surface-muted/30 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <code className="text-sm font-mono text-text">{ep.path}</code>
                    <p className="text-xs text-text-muted mt-1">{ep.description}</p>
                  </div>
                  <Badge tone="success">Active</Badge>
                </div>
                <div className="mt-3">
                  <Button size="sm" variant="secondary" onClick={() => handleTest(ep)}>
                    Test webhook
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent events</CardTitle>
              <CardDescription>Last {filtered.length} events received</CardDescription>
            </div>
            <div className="flex gap-1">
              {(["all", "clerk", "payabli"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                    filter === f
                      ? "bg-accent text-accent-ink border-accent"
                      : "bg-surface border-border text-text-muted hover:text-text"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {filtered.map((evt) => (
              <div key={evt.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge tone={evt.source === "clerk" ? "info" : "accent"}>
                      {evt.source}
                    </Badge>
                    <code className="text-sm font-mono text-text truncate">
                      {evt.eventType}
                    </code>
                    <span className="text-xs text-text-subtle shrink-0">
                      {evt.timestamp}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={evt.status === "success" ? "success" : "danger"}>
                      {evt.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpanded(expanded === evt.id ? null : evt.id)}
                    >
                      {expanded === evt.id ? "Hide" : "Expand"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleReplay(evt)}
                    >
                      Replay
                    </Button>
                  </div>
                </div>
                {expanded === evt.id && (
                  <pre className="mt-3 bg-neutral-900 text-neutral-100 text-xs font-mono rounded-md p-3 overflow-x-auto">
                    {JSON.stringify(evt.payload, null, 2)}
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
