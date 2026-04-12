"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ReplyCompose, NewThreadCompose } from "./compose";
import { formatRelative } from "@/lib/utils/format";

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

// ---------- Types matching the serialized data from the server ----------
// Note: this interface intentionally does NOT carry `aiDrafted` or
// `senderAgent` — those are stripped server-side before the page renders
// so patients never see agent attribution on their messages.

interface MessageData {
  id: string;
  body: string;
  status: string;
  senderUserId: string | null;
  sender: { firstName: string; lastName: string } | null;
  createdAt: string;
}

interface ThreadData {
  id: string;
  subject: string;
  lastMessageAt: string;
  messages: MessageData[];
}

interface Props {
  threads: ThreadData[];
  currentUserId: string;
}

/**
 * "Care team is reviewing" inline status card. Shown immediately below a
 * patient's own message when there's no care-team reply yet. Communicates
 * "we got it, we're working on it" without mentioning the agent layer at
 * all. From the patient's perspective the care team is their care team —
 * the AI assist happens behind the curtain.
 */
function CareTeamReviewingCard() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-2.5 max-w-[80%]">
        <div
          aria-hidden="true"
          className="h-7 w-7 rounded-full bg-accent-soft border border-accent/25 flex items-center justify-center shrink-0 mt-1"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
        </div>
        <div>
          <div className="rounded-xl px-4 py-2.5 bg-accent-soft/60 border border-accent/20 text-sm leading-relaxed text-text italic">
            Your care team is reviewing your message. Typical response time is
            within 24 hours — sooner for anything urgent.
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-text-subtle">Care team</span>
            <span className="text-[10px] text-accent uppercase tracking-wider">
              · reviewing
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PatientMessagesView({ threads, currentUserId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeThreadId = searchParams.get("thread");
  const [showCompose, setShowCompose] = useState(false);
  const [callToast, setCallToast] = useState<string | null>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  function selectThread(id: string) {
    router.push(`/portal/messages?thread=${id}`, { scroll: false });
  }

  return (
    <>
      {/* New message compose card */}
      <NewThreadCompose
        open={showCompose}
        onClose={() => setShowCompose(false)}
      />

      {threads.length === 0 && !showCompose ? (
        <EmptyState
          title="No messages yet"
          description="Your care team will reach out after your first visit. You can also start a conversation."
          action={
            <Button onClick={() => setShowCompose(true)}>New message</Button>
          }
        />
      ) : (
        <div className="flex flex-col md:flex-row gap-4 min-h-[480px]">
          {/* Thread list panel */}
          <Card className="md:w-[320px] shrink-0 overflow-hidden">
            <div className="p-3 border-b border-border">
              <Button
                size="sm"
                className="w-full"
                onClick={() => setShowCompose(true)}
              >
                New message
              </Button>
            </div>
            <div className="overflow-y-auto max-h-[560px]">
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
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-text truncate">
                        {t.subject}
                      </p>
                      <span className="text-[11px] text-text-subtle whitespace-nowrap">
                        {formatRelative(t.lastMessageAt)}
                      </span>
                    </div>
                    {lastMsg && (
                      <p className="text-xs text-text-muted mt-1 line-clamp-2">
                        {lastMsg.body}
                      </p>
                    )}
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
                    <h2 className="font-display text-lg text-text">
                      {activeThread.subject}
                    </h2>
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

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {/* Show messages in chronological order */}
                  {(() => {
                    const chronological = [...activeThread.messages].reverse();
                    // Detect whether the last message is from the patient
                    // with no care-team reply after it. If so we'll render
                    // a "care team is reviewing" system card below it.
                    const lastMsg = chronological[chronological.length - 1];
                    const awaitingReply =
                      lastMsg != null && lastMsg.senderUserId === currentUserId;
                    return (
                      <>
                        {chronological.map((msg) => {
                          const isOwn = msg.senderUserId === currentUserId;
                          const senderName = isOwn
                            ? "You"
                            : msg.sender
                              ? `${msg.sender.firstName} ${msg.sender.lastName}`
                              : "Care Team";

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
                                    firstName={msg.sender?.firstName ?? "C"}
                                    lastName={msg.sender?.lastName ?? "T"}
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
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {awaitingReply && <CareTeamReviewingCard />}
                      </>
                    );
                  })()}
                </div>

                {/* Reply bar */}
                <ReplyCompose threadId={activeThread.id} />
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
      )}
    </>
  );
}
