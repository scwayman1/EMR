"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

interface SyncLogEntry {
  timestamp: string;
  direction: "push" | "pull";
  summary: string;
  status: "success" | "failed";
}

const DEMO_LOG: SyncLogEntry[] = [
  { timestamp: "2026-04-16 09:42", direction: "pull", summary: "Imported 3 events from Google", status: "success" },
  { timestamp: "2026-04-16 09:42", direction: "push", summary: "Pushed 7 appointments to Google", status: "success" },
  { timestamp: "2026-04-16 08:10", direction: "pull", summary: "Imported 1 event", status: "success" },
  { timestamp: "2026-04-15 18:02", direction: "push", summary: "Conflict: appointment moved", status: "failed" },
  { timestamp: "2026-04-15 14:30", direction: "pull", summary: "Imported 2 events", status: "success" },
];

export function CalendarSyncView() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncTwoWay, setSyncTwoWay] = useState(true);
  const [blockClinicHours, setBlockClinicHours] = useState(false);
  const [connectedEmail] = useState("dr.patel@leafjourney.com");

  const handleConnect = () => {
    setConnecting(true);
    // Mock OAuth flow
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
    }, 1200);
  };

  const handleDisconnect = () => {
    setConnected(false);
  };

  if (!connected) {
    return (
      <Card tone="raised">
        <CardHeader>
          <CardTitle>Connect your Google Calendar</CardTitle>
          <CardDescription>
            Authorize Leafjourney to read and write events to your primary Google Calendar.
            You can disconnect at any time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-surface-muted/50 p-6 flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-white border border-border flex items-center justify-center text-3xl shadow-sm">
              G
            </div>
            <div>
              <p className="text-sm font-medium text-text">Google Calendar</p>
              <p className="text-xs text-text-muted mt-1">
                Secure OAuth 2.0 — we never see your password
              </p>
            </div>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? "Connecting…" : "Connect Google Calendar"}
            </Button>
            <p className="text-[11px] text-text-subtle max-w-md">
              This is a demo stub. In production this opens a Google OAuth consent screen
              and exchanges authorization codes for access tokens.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card tone="raised">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Connected</CardTitle>
              <CardDescription>{connectedEmail}</CardDescription>
            </div>
            <Badge tone="success">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted/50 border border-border">
            <div className="text-sm text-text">Last sync</div>
            <div className="text-sm text-text-muted">3 minutes ago</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Sync appointments 2-way"
            description="Create, update, and delete events in both Leafjourney and Google"
            checked={syncTwoWay}
            onChange={setSyncTwoWay}
          />
          <ToggleRow
            label="Block calendar during clinic hours"
            description="Automatically mark clinic hours as 'busy' in Google Calendar"
            checked={blockClinicHours}
            onChange={setBlockClinicHours}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent sync log</CardTitle>
          <CardDescription>Last 5 sync events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {DEMO_LOG.map((entry, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <Badge tone={entry.direction === "pull" ? "info" : "accent"}>
                    {entry.direction === "pull" ? "↓ Pull" : "↑ Push"}
                  </Badge>
                  <div>
                    <div className="text-text">{entry.summary}</div>
                    <div className="text-xs text-text-subtle">{entry.timestamp}</div>
                  </div>
                </div>
                <Badge tone={entry.status === "success" ? "success" : "danger"}>
                  {entry.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card tone="outlined">
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-text">Disconnect Google Calendar</div>
            <div className="text-xs text-text-muted mt-1">
              Stops all sync. Existing events are preserved in both places.
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-surface-muted/50 text-left"
    >
      <div>
        <div className="text-sm font-medium text-text">{label}</div>
        <div className="text-xs text-text-muted mt-0.5">{description}</div>
      </div>
      <div
        className={cn(
          "relative h-6 w-10 rounded-full transition-colors shrink-0 mt-1",
          checked ? "bg-accent" : "bg-border-strong/60"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </div>
    </button>
  );
}
