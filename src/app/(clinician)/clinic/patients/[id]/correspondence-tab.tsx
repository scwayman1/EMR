"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/utils/format";
import { sendChartReply, type ChartReplyResult } from "./correspondence-actions";

/* ── Serialized types ─────────────────────────────────────────── */

export interface SerializedMessage {
  id: string;
  body: string;
  status: string;
  aiDrafted: boolean;
  senderUserId: string | null;
  senderAgent: string | null;
  sender: { firstName: string; lastName: string } | null;
  createdAt: string;
}

export interface SerializedThread {
  id: string;
  subject: string;
  lastMessageAt: string;
  messages: SerializedMessage[];
}

interface CorrespondenceTabProps {
  threads: SerializedThread[];
  currentUserId: string;
  patientFirstName: string;
  patientLastName: string;
}

/* ── Reply submit button ──────────────────────────────────────── */

function ReplySubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Sending..." : "Send"}
    </Button>
  );
}

/* ── Inline reply compose ─────────────────────────────────────── */

function InlineReplyCompose({ threadId }: { threadId: string }) {
  const [state, formAction] = useFormState<ChartReplyResult | null, FormData>(
    sendChartReply,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border-t border-border p-4 bg-surface"
    >
      <input type="hidden" name="threadId" value={threadId} />
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Textarea
            name="body"
            rows={2}
            placeholder="Type your reply..."
            required
            className="resize-none"
          />
        </div>
        <ReplySubmitButton />
      </div>
      {state?.ok === false && (
        <p className="text-xs text-danger mt-2">{state.error}</p>
      )}
    </form>
  );
}

/* ── Main correspondence tab component ────────────────────────── */

export function CorrespondenceTab({
  threads,
  currentUserId,
  patientFirstName,
  patientLastName,
}: CorrespondenceTabProps) {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    threads[0]?.id ?? null
  );

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  if (threads.length === 0) {
    return (
      <EmptyState
        title="No messages with this patient yet"
        description="Start a conversation to coordinate care, share updates, or answer questions."
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 min-h-[480px]">
      {/* ── Thread list ──────────────────────────────────── */}
      <div className="md:w-[280px] shrink-0">
        <Card className="overflow-hidden">
          <div className="overflow-y-auto max-h-[560px]">
            {threads.map((t) => {
              const isActive = t.id === activeThreadId;
              const lastMsg = t.messages[0];
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveThreadId(t.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border/60 transition-colors hover:bg-surface-muted ${
                    isActive
                      ? "bg-surface-muted border-l-2 border-l-accent"
                      : "border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-sm font-medium text-text truncate">
                      {t.subject}
                    </p>
                    <span className="text-[11px] text-text-subtle whitespace-nowrap">
                      {formatRelative(t.lastMessageAt)}
                    </span>
                  </div>
                  {lastMsg && (
                    <p className="text-xs text-text-subtle line-clamp-1">
                      {lastMsg.body}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Active thread detail ─────────────────────────── */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {activeThread ? (
          <>
            {/* Thread header */}
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar
                  firstName={patientFirstName}
                  lastName={patientLastName}
                  size="sm"
                />
                <div>
                  <h3 className="font-display text-lg text-text leading-tight">
                    {activeThread.subject}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {patientFirstName} {patientLastName} &middot;{" "}
                    {activeThread.messages.length} message
                    {activeThread.messages.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages area (chronological) */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {[...activeThread.messages].reverse().map((msg) => {
                const isOwn = msg.senderUserId === currentUserId;
                const senderName = isOwn
                  ? "You"
                  : msg.sender
                    ? `${msg.sender.firstName} ${msg.sender.lastName}`
                    : msg.senderAgent
                      ? msg.senderAgent.split(":")[0] ?? "AI Assistant"
                      : `${patientFirstName} ${patientLastName}`;

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
                            msg.sender?.firstName ?? patientFirstName
                          }
                          lastName={
                            msg.sender?.lastName ?? patientLastName
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

            {/* Reply compose bar */}
            <InlineReplyCompose threadId={activeThread.id} />
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
