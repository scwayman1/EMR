"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

interface Backup {
  date: string;
  status: "success" | "failed";
  sizeGb: number;
  durationSec: number;
}

function generateHistory(): Backup[] {
  const out: Backup[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const fail = i === 12 || i === 27;
    out.push({
      date: d.toISOString().slice(0, 10),
      status: fail ? "failed" : "success",
      sizeGb: +(12 + Math.random() * 2).toFixed(2),
      durationSec: Math.floor(180 + Math.random() * 120),
    });
  }
  return out;
}

function nextBackupDate(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(2, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function formatCountdown(diff: number): string {
  if (diff <= 0) return "any moment";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
}

export function BackupsView() {
  const [history, setHistory] = useState<Backup[]>(() => generateHistory());
  const [now, setNow] = useState<number>(() => Date.now());
  const [showRestore, setShowRestore] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const next = useMemo(() => nextBackupDate(), []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const runManual = () => {
    const b: Backup = {
      date: new Date().toISOString().slice(0, 10) + "T" + new Date().toTimeString().slice(0, 5),
      status: "success",
      sizeGb: +(12.4 + Math.random()).toFixed(2),
      durationSec: 165,
    };
    setHistory([...history.slice(-29), b]);
    setToast("Manual backup started — you'll get a notification when it completes.");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="rounded-md border border-accent/30 bg-accent-soft text-accent p-3 text-sm">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card tone="raised">
          <CardHeader>
            <CardDescription>Schedule</CardDescription>
            <CardTitle>Daily at 2:00 UTC</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">
              Full database snapshot + incremental file storage sync.
            </p>
          </CardContent>
        </Card>

        <Card tone="raised">
          <CardHeader>
            <CardDescription>Next backup in</CardDescription>
            <CardTitle>{formatCountdown(next.getTime() - now)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">{next.toUTCString()}</p>
          </CardContent>
        </Card>

        <Card tone="raised">
          <CardHeader>
            <CardDescription>Retention policy</CardDescription>
            <CardTitle>35 days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">
              Daily for 35 days, then monthly snapshots for 12 months.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Last 30 days</CardTitle>
              <CardDescription>Green = success, red = failed</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={runManual}>
                Manual backup
              </Button>
              <Button variant="danger" onClick={() => setShowRestore(true)}>
                Restore from backup
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {history.map((b) => (
              <div
                key={b.date}
                title={`${b.date} • ${b.status} • ${b.sizeGb} GB • ${b.durationSec}s`}
                className={cn(
                  "h-7 w-7 rounded-sm border",
                  b.status === "success"
                    ? "bg-accent/80 border-accent"
                    : "bg-danger/80 border-danger"
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup history</CardTitle>
          <CardDescription>Detailed list of recent backups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {[...history].reverse().slice(0, 10).map((b) => (
              <div key={b.date} className="py-2.5 flex items-center justify-between gap-4 text-sm">
                <div className="font-mono text-text">{b.date}</div>
                <div className="text-text-muted">{b.sizeGb} GB</div>
                <div className="text-text-muted">{b.durationSec}s</div>
                <Badge tone={b.status === "success" ? "success" : "danger"}>
                  {b.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {showRestore && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowRestore(false)}
        >
          <div
            className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl text-text mb-2">Restore from backup?</h2>
            <div className="rounded-md border border-danger/30 bg-red-50 text-danger text-sm p-3 mb-4">
              <strong>Warning:</strong> Restoring will replace current data. This operation
              is not reversible. The system will be in read-only mode for ~15 minutes.
            </div>
            <p className="text-sm text-text-muted mb-4">
              In production, you'd select a specific point-in-time here.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowRestore(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setShowRestore(false)}>
                I understand — restore
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
