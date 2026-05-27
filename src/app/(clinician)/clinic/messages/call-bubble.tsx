"use client";

import { useTransition, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/format";
import { launchCallAction } from "@/lib/communications/calls";

// EMR-604 — WhatsApp-style in-thread call record bubble. Renders the same
// info pattern as WhatsApp's missed-call cards: type, outcome, duration,
// timestamp. The bubble is itself the redial trigger.

export interface CallLogData {
  id: string;
  channel: string;       // "phone" | "video" | "sms" | "secure_message"
  direction: string;     // "inbound" | "outbound"
  status: string;        // "initiated" | "in_progress" | "completed" | "missed" | "no_answer" | "failed"
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
}

interface Props {
  call: CallLogData;
  patientId: string;
  threadId: string;
}

function formatDuration(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} s`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} s`;
}

function bubbleLabel(call: CallLogData): string {
  const typeWord = call.channel === "video" ? "video call" : "audio call";
  const isMissed =
    call.status === "missed" ||
    call.status === "no_answer" ||
    call.status === "failed";
  if (isMissed) {
    const verb = call.direction === "outbound" ? "Unanswered" : "Missed";
    return `${verb} ${typeWord}`;
  }
  const dur = formatDuration(call.durationSeconds);
  if (dur) {
    return `${typeWord[0].toUpperCase()}${typeWord.slice(1)} · ${dur}`;
  }
  return `${typeWord[0].toUpperCase()}${typeWord.slice(1)}`;
}

function isMissed(call: CallLogData): boolean {
  return (
    call.status === "missed" ||
    call.status === "no_answer" ||
    call.status === "failed"
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="1" y="3.5" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 6.5L13 4.5V9.5L9 7.5V6.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3 2C2.4 2 2 2.4 2 3v1.5C2 8.6 5.4 12 9.5 12H11c.6 0 1-.4 1-1V9.5c0-.5-.4-.9-.9-1L9.6 8.2c-.4-.1-.8 0-1.1.3L7.9 9.1c-1.6-.7-2.9-2-3.7-3.6l.6-.6c.3-.3.4-.7.3-1.1L4.5 2.9C4.4 2.4 4 2 3.5 2H3z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CallBubble({ call, patientId, threadId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const missed = isMissed(call);
  const Icon = call.channel === "video" ? VideoIcon : PhoneIcon;

  function redial() {
    setError(null);
    const fd = new FormData();
    // Map our stored channel back to the launch action's expected value.
    fd.set("channel", call.channel === "video" ? "video" : "phone");
    fd.set("patientId", patientId);
    fd.set("messageThreadId", threadId);
    startTransition(async () => {
      const result = await launchCallAction(fd);
      if (!result.ok) {
        setError(result.error ?? "Could not start call");
      }
    });
  }

  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={redial}
        disabled={pending}
        aria-label={`Redial — ${bubbleLabel(call)}`}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5",
          "text-xs leading-none border transition-colors",
          missed
            ? "bg-danger-soft/40 text-danger border-danger/30 hover:bg-danger-soft/60"
            : "bg-surface-muted text-text-muted border-border/60 hover:bg-surface-raised hover:text-text",
          "disabled:opacity-60 disabled:cursor-wait",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        )}
      >
        <Icon
          className={cn(
            "shrink-0",
            missed ? "text-danger" : "text-text-subtle",
          )}
        />
        <span className="font-medium">{bubbleLabel(call)}</span>
        <span className="text-text-subtle">·</span>
        <span className="text-text-subtle">{formatRelative(call.startedAt)}</span>
      </button>
      {error && (
        <span className="ml-2 text-xs text-danger" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
