"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
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

export function ClinicMessagesView({ threads, currentUserId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeThreadId = searchParams.get("thread");

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
            </div>

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
                            isOwn
                              ? "bg-accent-soft text-text"
                              : "bg-surface-raised text-text border border-border/60"
                          }`}
                        >
                          {msg.body}
                        </div>
                        <div
                          className={`flex items-center gap-2 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <span className="text-xs text-text-subtle">
                            {senderName}
                          </span>
                          <span className="text-xs text-text-subtle">
                            {formatRelative(msg.createdAt)}
                          </span>
                          {msg.aiDrafted && (
                            <Badge tone="highlight">AI Draft</Badge>
                          )}
                        </div>
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
