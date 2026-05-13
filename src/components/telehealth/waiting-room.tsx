"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type WaitingStatus = "waiting" | "provider_ready" | "in_call" | "ended";

export interface WaitingRoomProps {
  patientName: string;
  providerName: string;
  appointmentTimeIso: string;
  queuePosition?: number;
  status?: WaitingStatus;
  onJoin?: () => void;
  onLeave?: () => void;
  onToggleMic?: (muted: boolean) => void;
  onToggleCamera?: (off: boolean) => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WaitingRoom({
  patientName,
  providerName,
  appointmentTimeIso,
  queuePosition,
  status = "waiting",
  onJoin,
  onLeave,
  onToggleMic,
  onToggleCamera,
}: WaitingRoomProps) {
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status === "ended") return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  const statusBanner = useMemo(() => {
    if (status === "provider_ready") {
      return { label: "Your provider is ready", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    if (status === "in_call") {
      return { label: "Connected", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    if (status === "ended") {
      return { label: "Call ended", tone: "bg-[var(--surface-muted)] text-text-muted border-[var(--border)]" };
    }
    return { label: "Waiting for provider", tone: "bg-amber-50 text-amber-700 border-amber-200" };
  }, [status]);

  const handleMic = () => {
    const next = !muted;
    setMuted(next);
    onToggleMic?.(next);
  };

  const handleCamera = () => {
    const next = !cameraOff;
    setCameraOff(next);
    onToggleCamera?.(next);
  };

  const canJoin = status === "provider_ready" || status === "in_call";

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Telehealth Waiting Room</CardTitle>
        <CardDescription>
          {patientName} • Visit with {providerName} at {formatTime(appointmentTimeIso)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className={`text-sm font-medium px-3 py-2 rounded-lg border ${statusBanner.tone}`}>
          {statusBanner.label}
          {status === "waiting" && queuePosition != null && queuePosition > 1 && (
            <span className="ml-2 text-text-muted">— position {queuePosition} in queue</span>
          )}
        </div>

        <div className="aspect-video w-full rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] grid place-items-center text-text-muted">
          {cameraOff ? (
            <div className="text-center">
              <div className="text-4xl mb-2" aria-hidden="true">📷</div>
              <div className="text-sm">Camera off</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-[var(--accent)]/20 grid place-items-center text-[var(--accent)] text-3xl font-bold mx-auto mb-2">
                {patientName.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm">{patientName}</div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Connection: stable</span>
          <span className="tabular-nums">In room {formatElapsed(elapsed)}</span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleMic}
            className={`w-12 h-12 rounded-full border grid place-items-center transition-colors ${
              muted
                ? "bg-red-50 border-red-200 text-red-600"
                : "bg-white border-[var(--border)] text-text hover:border-[var(--accent)]"
            }`}
            aria-pressed={muted}
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          >
            {muted ? "🔇" : "🎙️"}
          </button>
          <button
            type="button"
            onClick={handleCamera}
            className={`w-12 h-12 rounded-full border grid place-items-center transition-colors ${
              cameraOff
                ? "bg-red-50 border-red-200 text-red-600"
                : "bg-white border-[var(--border)] text-text hover:border-[var(--accent)]"
            }`}
            aria-pressed={cameraOff}
            aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
          >
            {cameraOff ? "🚫" : "📷"}
          </button>
        </div>
      </CardContent>
      <CardFooter className="pt-6 border-t border-[var(--border)] flex justify-between">
        <Button type="button" variant="ghost" onClick={onLeave}>
          Leave
        </Button>
        <Button type="button" variant="primary" disabled={!canJoin} onClick={onJoin}>
          {status === "in_call" ? "In call" : canJoin ? "Join visit" : "Waiting…"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default WaitingRoom;
