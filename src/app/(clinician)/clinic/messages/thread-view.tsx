"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { AgentSignal } from "@/components/ui/agent-signal";
import {
  InThreadDraftReview,
  DraftReadyBanner,
} from "@/components/agent/in-thread-draft-review";
import { resolveAgentMeta } from "@/lib/agents/ui-registry";
import { ClinicReplyCompose } from "./compose";
import { formatRelative } from "@/lib/utils/format";

// ---------- Types matching the serialized data from the server ----------

interface MessageData {
  id: string;
  body: string;
  status: string;
  aiDrafted: boolean;
  senderUserId: string | null;
  senderAgent: string | null;
  sender: { firstName: string; lastName: string } | null;
  createdAt: string;
}

interface PatientData {
  firstName: string;
  lastName: string;
}

interface ThreadData {
  id: string;
  subject: string;
  lastMessageAt: string;
  patient: PatientData;
  messages: MessageData[];
}

interface Props {
  threads: ThreadData[];
  currentUserId: string;
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

export function ClinicMessagesView({ threads, currentUserId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeThreadId = searchParams.get("thread");
  const [callToast, setCallToast] = useState<string | null>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  function selectThread(id: string) {
    router.push(`/clinic/messages?thread=${id}`, { scroll: false });
  }

  if (threads.length === 0) {
    return (
      <EmptyState
        title="No conversations yet"
        description="Patient messages will appear here once they start a conversation."
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 min-h-[540px]">
      {/* Thread list panel */}
      <Card className="md:w-[360px] shrink-0 overflow-hidden">
        <div className="overflow-y-auto max-h-[640px]">
          {threads.map((t) => {
            const isActive = t.id === activeThreadId;
            const lastMsg = t.messages[0];
            return (
              <button
                key={t.id}
                onClick={() => selectThread(t.id)}
                className={`w-full text-left px-4 py-3 border-b border-border/60 transition-colors hover:bg-surface-muted ${
                  isActive
                    ? "bg-surface-muted border-l-2 border-l-accent"
                    : "border-l-2 border-l-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Avatar
                    firstName={t.patient.firstName}
                    lastName={t.patient.lastName}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-text truncate">
                        {t.patient.firstName} {t.patient.lastName}
                      </p>
                      <span className="text-[11px] text-text-subtle whitespace-nowrap">
                        {formatRelative(t.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted truncate">
                      {t.subject}
                    </p>
                    {lastMsg && (
                      <p className="text-xs text-text-subtle mt-0.5 line-clamp-1">
                        {lastMsg.body}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Thread detail panel */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {activeThread ? (
          <>
            {/* Thread header */}
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    firstName={activeThread.patient.firstName}
                    lastName={activeThread.patient.lastName}
                    size="sm"
                  />
                  <div>
                    <h2 className="font-display text-lg text-text leading-tight">
                      {activeThread.subject}
                    </h2>
                    <p className="text-xs text-text-muted">
                      {activeThread.patient.firstName}{" "}
                      {activeThread.patient.lastName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCallToast("Voice calling coming soon");
                      setTimeout(() => setCallToast(null), 2500);
                    }}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
                    aria-label="Voice call"
                  >
                    <PhoneIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCallToast("Video calling coming soon");
                      setTimeout(() => setCallToast(null), 2500);
                    }}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
                    aria-label="Video call"
                  >
                    <VideoIcon />
                  </button>
                </div>
              </div>
              {callToast && (
                <div className="mt-2 text-xs text-text-muted bg-surface-muted rounded-lg px-3 py-2 text-center">
                  {callToast}
                </div>
              )}
            </div>

            {/* Draft-ready banner above the messages — visible heads-up when
                Nurse Nora (or any agent) has drafted a reply that's sitting
                in review. The inline draft review card below the bubble is
                where the clinician actually takes action. */}
            {(() => {
              const pendingDrafts = activeThread.messages.filter(
                (m) => m.aiDrafted && m.status === "draft",
              );
              if (pendingDrafts.length === 0) return null;
              return (
                <DraftReadyBanner
                  agent={pendingDrafts[0].senderAgent}
                  draftCount={pendingDrafts.length}
                />
              );
            })()}

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Show messages in chronological order */}
              {[...activeThread.messages].reverse().map((msg) => {
                const isOwn = msg.senderUserId === currentUserId;
                const isPatient =
                  !isOwn &&
                  msg.senderUserId !== null &&
                  !msg.senderAgent;
                const senderName = isOwn
                  ? "You"
                  : msg.sender
                    ? `${msg.sender.firstName} ${msg.sender.lastName}`
                    : msg.senderAgent
                      ? msg.senderAgent.split(":")[0] ?? "AI Assistant"
                      : "Patient";

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex gap-2.5 max-w-[80%] ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {!isOwn && (
                        <Avatar
                          firstName={
                            msg.sender?.firstName ??
                            (isPatient
                              ? activeThread.patient.firstName
                              : "A")
                          }
                          lastName={
                            msg.sender?.lastName ??
                            (isPatient
                              ? activeThread.patient.lastName
                              : "I")
                          }
                          size="sm"
                          className="mt-1 shrink-0"
                        />
                      )}
                      <div>
                        <div
                          className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                            msg.aiDrafted && msg.status === "draft"
                              ? "bg-highlight-soft/40 text-text border border-highlight/30 border-dashed"
                              : isOwn
                                ? "bg-accent-soft text-text"
                                : "bg-surface-raised text-text border border-border/60"
                          }`}
                        >
                          {msg.body}
                        </div>
                        <div
                          className={`flex items-center gap-2 mt-1 flex-wrap ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <span className="text-xs text-text-subtle">
                            {msg.aiDrafted
                              ? resolveAgentMeta(msg.senderAgent).displayName
                              : senderName}
                          </span>
                          <span className="text-xs text-text-subtle">
                            {formatRelative(msg.createdAt)}
                          </span>
                          {msg.aiDrafted && (
                            <AgentSignal
                              agent={msg.senderAgent}
                              label={
                                msg.status === "draft"
                                  ? "awaiting approval"
                                  : "drafted this"
                              }
                            />
                          )}
                        </div>
                        {msg.aiDrafted && msg.status === "draft" && (
                          <InThreadDraftReview
                            messageId={msg.id}
                            initialBody={msg.body}
                            agent={msg.senderAgent}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply bar */}
            <ClinicReplyCompose threadId={activeThread.id} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-text-muted">
              Select a conversation to view messages
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
