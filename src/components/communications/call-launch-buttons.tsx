"use client";

// EMR-034 / EMR-037 — phone + video icons that launch a real call.
//
// On click, posts to `launchCallAction` which writes a CallLog row
// and returns a session id. The component then opens an in-progress
// call card (modal-style overlay) until the clinician ends the call,
// at which point we POST to `endCallAction` to record duration and,
// if a transcript was captured, persist the redacted summary.

import { useState, useEffect, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { launchCallAction, endCallAction } from "@/lib/communications/calls";

interface BaseProps {
  counterpartyName: string;
  // Optional thread linkage for audit.
  messageThreadId?: string;
  providerMessageThreadId?: string;
}

interface PatientTarget extends BaseProps {
  patientId: string;
  providerUserId?: never;
  externalNumber?: never;
}
interface ProviderTarget extends BaseProps {
  providerUserId: string;
  patientId?: never;
  externalNumber?: never;
}
interface ExternalTarget extends BaseProps {
  externalNumber: string;
  patientId?: never;
  providerUserId?: never;
}

type Props = PatientTarget | ProviderTarget | ExternalTarget;

export function CallLaunchButtons(props: Props) {
  const [activeCall, setActiveCall] = useState<{
    callId: string;
    channel: "phone" | "video";
    startedAt: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function launch(channel: "phone" | "video") {
    setError(null);
    const fd = new FormData();
    fd.set("channel", channel);
    if (props.patientId) fd.set("patientId", props.patientId);
    if (props.providerUserId) fd.set("providerUserId", props.providerUserId);
    if (props.externalNumber) fd.set("externalNumber", props.externalNumber);
    if (props.messageThreadId) fd.set("messageThreadId", props.messageThreadId);
    if (props.providerMessageThreadId)
      fd.set("providerMessageThreadId", props.providerMessageThreadId);

    startTransition(async () => {
      const result = await launchCallAction(fd);
      if (result.ok) {
        setActiveCall({
          callId: result.callId,
          channel,
          startedAt: Date.now(),
        });
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => launch("phone")}
          disabled={pending || !!activeCall}
          aria-label={`Phone call with ${props.counterpartyName}`}
          className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors disabled:opacity-50"
        >
          <PhoneIcon />
        </button>
        <button
          type="button"
          onClick={() => launch("video")}
          disabled={pending || !!activeCall}
          aria-label={`Video call with ${props.counterpartyName}`}
          className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors disabled:opacity-50"
        >
          <VideoIcon />
        </button>
      </div>
      {error && (
        <p className="text-xs text-danger mt-1">{error}</p>
      )}
      {activeCall && (
        <ActiveCallOverlay
          call={activeCall}
          counterpartyName={props.counterpartyName}
          onEnded={() => setActiveCall(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// In-progress call overlay
// ---------------------------------------------------------------------------

function ActiveCallOverlay({
  call,
  counterpartyName,
  onEnded,
}: {
  call: { callId: string; channel: "phone" | "video"; startedAt: number };
  counterpartyName: string;
  onEnded: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [rawTranscript, setRawTranscript] = useState("");
  const [pending, startTransition] = useTransition();
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setSeconds(Math.floor((Date.now() - call.startedAt) / 1000));
    }, 500);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [call.startedAt]);

  function endCall(status: "completed" | "cancelled") {
    const fd = new FormData();
    fd.set("callId", call.callId);
    fd.set("status", status);
    fd.set("durationSeconds", String(seconds));
    if (status === "completed" && rawTranscript.trim().length > 0) {
      fd.set("rawTranscript", rawTranscript);
    }
    startTransition(async () => {
      await endCallAction(fd);
      onEnded();
    });
  }

  const channelLabel = call.channel === "phone" ? "Phone call" : "Video call";

  return (
    <div className="fixed inset-0 z-[100] bg-text/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-text-subtle">
            {channelLabel} · in progress
          </p>
          <h2 className="font-display text-xl text-text mt-1">
            {counterpartyName}
          </h2>
          <p className="text-sm text-text-muted mt-1 tabular-nums">
            {formatDuration(seconds)}
          </p>
        </div>

        <div className="rounded-xl bg-surface-muted p-3 text-xs text-text-muted space-y-1">
          <p className="font-medium text-text">AI transcription</p>
          <p>
            Anything you paste below is filtered for PHI on the server before
            persistence — only pertinent clinical info is stored. Leave blank
            to skip.
          </p>
          <Textarea
            value={rawTranscript}
            onChange={(e) => setRawTranscript(e.target.value)}
            rows={4}
            placeholder="Paste or dictate the conversation here…"
            className="mt-2"
          />
        </div>

        <div className="flex justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => endCall("cancelled")}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => endCall("completed")}
            disabled={pending}
          >
            {pending ? "Ending…" : "End call"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function PhoneIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}
