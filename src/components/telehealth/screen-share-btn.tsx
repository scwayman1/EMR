"use client";

import React, { useState } from "react";

export interface ScreenShareBtnProps {
  isSharing?: boolean;
  /** If true, prompt for confirmation before starting share. Default true. */
  confirmBeforeShare?: boolean;
  onStartShare?: () => Promise<void> | void;
  onStopShare?: () => Promise<void> | void;
  className?: string;
}

type Phase = "idle" | "confirming" | "starting" | "sharing" | "stopping";

export function ScreenShareBtn({
  isSharing = false,
  confirmBeforeShare = true,
  onStartShare,
  onStopShare,
  className,
}: ScreenShareBtnProps) {
  const [phase, setPhase] = useState<Phase>(isSharing ? "sharing" : "idle");

  const handleClick = async () => {
    if (phase === "starting" || phase === "stopping") return;
    if (phase === "sharing") {
      setPhase("stopping");
      try {
        await onStopShare?.();
        setPhase("idle");
      } catch {
        setPhase("sharing");
      }
      return;
    }
    if (confirmBeforeShare && phase === "idle") {
      setPhase("confirming");
      return;
    }
    await beginShare();
  };

  const beginShare = async () => {
    setPhase("starting");
    try {
      await onStartShare?.();
      setPhase("sharing");
    } catch {
      setPhase("idle");
    }
  };

  const cancelConfirm = () => setPhase("idle");

  const isActive = phase === "sharing" || phase === "starting";
  const label =
    phase === "starting"
      ? "Starting…"
      : phase === "stopping"
        ? "Stopping…"
        : phase === "sharing"
          ? "Stop sharing"
          : "Share screen";

  return (
    <div className={`inline-block ${className ?? ""}`}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isActive}
        disabled={phase === "starting" || phase === "stopping"}
        className={`inline-flex items-center gap-2 px-4 h-11 rounded-xl border text-sm font-medium transition-colors ${
          isActive
            ? "bg-[var(--accent)] text-white border-[var(--accent)] hover:bg-[var(--accent)]/90"
            : "bg-white text-text border-[var(--border)] hover:border-[var(--accent)]"
        } disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        <span aria-hidden="true">🖥️</span>
        {label}
        {isActive && phase === "sharing" && (
          <span className="ml-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Live
          </span>
        )}
      </button>

      {phase === "confirming" && (
        <div
          role="dialog"
          aria-label="Confirm screen share"
          className="mt-3 max-w-sm p-4 rounded-2xl border border-[var(--border)] bg-white shadow-md"
        >
          <p className="text-sm text-text">
            You&apos;re about to share your screen. Only share what&apos;s relevant — close any windows
            with PHI you don&apos;t intend to show.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelConfirm}
              className="px-3 h-9 rounded-lg text-sm border border-[var(--border)] hover:bg-[var(--surface-muted)]/40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={beginShare}
              className="px-3 h-9 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90"
            >
              Share screen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScreenShareBtn;
