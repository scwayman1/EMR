"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { AgentSignal } from "@/components/ui/agent-signal";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/format";
import {
  PRIORITY_CONFIG,
  CATEGORY_LABELS,
  type TriagedMessage,
  type MessagePriority,
  type MessageCategory,
} from "@/lib/domain/smart-inbox";
import { sendReply } from "./actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface ThreadMessageData {
  threadId: string;
  patientName: string;
  subject: string;
  messages: MessageData[];
}

interface Props {
  triaged: TriagedMessage[];
  threadMessages: ThreadMessageData[];
  currentUserId: string;
}

// ---------------------------------------------------------------------------
// Priority filter config
// ---------------------------------------------------------------------------

type PriorityFilter = "all" | MessagePriority;

const PRIORITY_FILTERS: { key: PriorityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "urgent", label: "Urgent" },
  { key: "high", label: "High" },
  { key: "routine", label: "Routine" },
  { key: "low", label: "Low" },
];

const PRIORITY_BORDER_COLORS: Record<MessagePriority, string> = {
  urgent: "border-l-red-500",
  high: "border-l-amber-500",
  routine: "border-l-blue-500",
  low: "border-l-gray-300",
};

const PRIORITY_BADGE_TONES: Record<MessagePriority, "danger" | "warning" | "info" | "neutral"> = {
  urgent: "danger",
  high: "warning",
  routine: "info",
  low: "neutral",
};

const CATEGORY_BADGE_TONE: Record<MessageCategory, "accent" | "warning" | "info" | "neutral" | "danger" | "highlight" | "success"> = {
  symptom_report: "info",
  medication_question: "warning",
  refill_request: "accent",
  appointment_request: "neutral",
  lab_question: "info",
  adverse_reaction: "danger",
  administrative: "neutral",
  follow_up: "accent",
  general: "neutral",
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function UserAlertIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="19" x2="19.01" y1="18" y2="18" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-emerald-600"
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}

function StethoscopeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Reply compose (inline)
// ---------------------------------------------------------------------------

function ReplySubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Sending..." : "Send"}
    </Button>
  );
}

function InlineReplyCompose({ threadId }: { threadId: string }) {
  const [state, formAction] = useFormState(sendReply, null);
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SmartInboxView({
  triaged,
  threadMessages,
  currentUserId,
}: Props) {
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<MessageCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    triaged[0]?.threadId ?? null,
  );

  // Compute counts per priority
  const priorityCounts = useMemo(() => {
    const counts: Record<PriorityFilter, number> = {
      all: triaged.length,
      urgent: 0,
      high: 0,
      routine: 0,
      low: 0,
    };
    for (const t of triaged) {
      counts[t.priority]++;
    }
    return counts;
  }, [triaged]);

  // Stats
  const urgentCount = priorityCounts.urgent;
  const needsClinicianCount = useMemo(
    () => triaged.filter((t) => t.needsClinician).length,
    [triaged],
  );

  // Unique categories present in the data
  const availableCategories = useMemo(() => {
    const cats = new Set<MessageCategory>();
    for (const t of triaged) cats.add(t.category);
    return Array.from(cats).sort();
  }, [triaged]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = triaged;

    if (priorityFilter !== "all") {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    if (categoryFilter !== "all") {
      list = list.filter((t) => t.category === categoryFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.patientName.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q),
      );
    }

    return list;
  }, [triaged, priorityFilter, categoryFilter, search]);

  // Active thread detail
  const selectedTriage = triaged.find((t) => t.threadId === selectedThreadId);
  const selectedThread = threadMessages.find(
    (t) => t.threadId === selectedThreadId,
  );

  // When filters change and selected thread is no longer visible, select the first visible
  useEffect(() => {
    if (
      selectedThreadId &&
      !filtered.some((t) => t.threadId === selectedThreadId)
    ) {
      setSelectedThreadId(filtered[0]?.threadId ?? null);
    }
  }, [filtered, selectedThreadId]);

  // Empty state: no threads at all
  if (triaged.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircleIcon />}
        title="Inbox zero — all caught up."
        description="No patient messages to review. Enjoy the calm."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Top bar: filters + stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: priority pills + category + search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority pills */}
          <div className="flex items-center gap-1 bg-surface-muted rounded-lg p-1">
            {PRIORITY_FILTERS.map((f) => {
              const isActive = priorityFilter === f.key;
              const count = priorityCounts[f.key];
              return (
                <button
                  key={f.key}
                  onClick={() => setPriorityFilter(f.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150",
                    isActive
                      ? "bg-surface shadow-sm text-text"
                      : "text-text-muted hover:text-text hover:bg-surface/60",
                  )}
                >
                  {f.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-semibold rounded-full px-1",
                        isActive
                          ? f.key === "urgent"
                            ? "bg-red-100 text-red-700"
                            : f.key === "high"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-surface-muted text-text-muted"
                          : "bg-surface-muted/60 text-text-subtle",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Category dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as MessageCategory | "all")
            }
            className="h-9 px-3 text-xs font-medium rounded-md border border-border-strong bg-surface text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            <option value="all">All categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-subtle">
              <SearchIcon />
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient or message..."
              className="pl-9 h-9 w-56 text-xs"
            />
          </div>
        </div>

        {/* Right: stats */}
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <InboxIcon />
            {triaged.length} total
          </span>
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-red-600 font-medium">
              <AlertTriangleIcon />
              {urgentCount} urgent
            </span>
          )}
          {needsClinicianCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <StethoscopeIcon />
              {needsClinicianCount} needs clinician
            </span>
          )}
        </div>
      </div>

      {/* Main content: list + detail */}
      <div className="flex flex-col md:flex-row gap-4 min-h-[600px]">
        {/* Left panel: triaged message list */}
        <Card className="md:w-[40%] shrink-0 overflow-hidden">
          <div className="overflow-y-auto max-h-[700px]">
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-text-muted">
                  No messages match your filters.
                </p>
              </div>
            ) : (
              filtered.map((t) => {
                const isSelected = t.threadId === selectedThreadId;
                return (
                  <button
                    key={t.threadId}
                    onClick={() => setSelectedThreadId(t.threadId)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-border/60 transition-colors hover:bg-surface-muted",
                      "border-l-[3px]",
                      PRIORITY_BORDER_COLORS[t.priority],
                      isSelected && "bg-surface-muted",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Row 1: patient name + timestamp */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {t.unreadCount > 0 && (
                              <span className="shrink-0 h-2 w-2 rounded-full bg-accent" />
                            )}
                            <p className="text-sm font-semibold text-text truncate">
                              {t.patientName}
                            </p>
                          </div>
                          <span className="text-[11px] text-text-subtle whitespace-nowrap shrink-0">
                            {formatRelative(t.lastMessageAt)}
                          </span>
                        </div>

                        {/* Row 2: subject */}
                        <p className="text-xs text-text mt-0.5 truncate">
                          {t.subject}
                        </p>

                        {/* Row 3: AI summary */}
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                          {t.summary}
                        </p>

                        {/* Row 4: badges */}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <Badge tone={CATEGORY_BADGE_TONE[t.category]}>
                            {CATEGORY_LABELS[t.category]}
                          </Badge>
                          {t.needsClinician && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700">
                              <UserAlertIcon />
                              Needs clinician
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Right panel: thread detail */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          {selectedTriage && selectedThread ? (
            <>
              {/* Thread header */}
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <Avatar
                    firstName={selectedThread.patientName.split(" ")[0] ?? ""}
                    lastName={selectedThread.patientName.split(" ")[1] ?? ""}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-lg text-text leading-tight truncate">
                      {selectedThread.subject}
                    </h2>
                    <p className="text-xs text-text-muted">
                      {selectedThread.patientName}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Triage card */}
              <div className="px-5 py-4 border-b border-border/60 bg-surface-muted/30">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5 text-accent">
                    <SparklesIcon />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
                        AI Triage
                      </span>
                      <Badge tone={PRIORITY_BADGE_TONES[selectedTriage.priority]}>
                        {PRIORITY_CONFIG[selectedTriage.priority].label}
                      </Badge>
                      <Badge tone={CATEGORY_BADGE_TONE[selectedTriage.category]}>
                        {CATEGORY_LABELS[selectedTriage.category]}
                      </Badge>
                      {selectedTriage.needsClinician && (
                        <Badge tone="warning">Needs Clinician</Badge>
                      )}
                    </div>
                    <p className="text-sm text-text leading-relaxed">
                      {selectedTriage.summary}
                    </p>
                    <p className="text-xs text-text-muted">
                      <span className="font-medium">Reason:</span>{" "}
                      {selectedTriage.triageReason}
                    </p>
                    {selectedTriage.suggestedAction && (
                      <p className="text-xs text-accent font-medium">
                        Suggested: {selectedTriage.suggestedAction}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Message history */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {[...selectedThread.messages].reverse().map((msg) => {
                  const isOwn = msg.senderUserId === currentUserId;
                  const isAgent = !!msg.senderAgent;
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
                      className={cn(
                        "flex",
                        isOwn || isAgent ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "flex gap-2.5 max-w-[80%]",
                          isOwn || isAgent ? "flex-row-reverse" : "flex-row",
                        )}
                      >
                        {!isOwn && !isAgent && (
                          <Avatar
                            firstName={
                              selectedThread.patientName.split(" ")[0] ?? ""
                            }
                            lastName={
                              selectedThread.patientName.split(" ")[1] ?? ""
                            }
                            size="sm"
                            className="mt-1 shrink-0"
                          />
                        )}
                        <div>
                          <div
                            className={cn(
                              "rounded-xl px-4 py-2.5 text-sm leading-relaxed",
                              msg.aiDrafted && msg.status === "draft"
                                ? "bg-highlight-soft/40 text-text border border-highlight/30 border-dashed"
                                : isOwn || isAgent
                                  ? "bg-accent-soft text-text"
                                  : "bg-surface-raised text-text border border-border/60",
                            )}
                          >
                            {msg.body}
                          </div>
                          <div
                            className={cn(
                              "flex items-center gap-2 mt-1 flex-wrap",
                              isOwn || isAgent
                                ? "justify-end"
                                : "justify-start",
                            )}
                          >
                            <span className="text-xs text-text-subtle">
                              {senderName}
                            </span>
                            <span className="text-xs text-text-subtle">
                              {formatRelative(msg.createdAt)}
                            </span>
                            {msg.aiDrafted && (
                              <AgentSignal
                                agent={msg.senderAgent}
                                label={
                                  msg.status === "draft"
                                    ? "AI draft"
                                    : "AI drafted"
                                }
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply area */}
              <InlineReplyCompose threadId={selectedThread.threadId} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-text-subtle mb-2 flex justify-center">
                  <InboxIcon />
                </div>
                <p className="text-sm text-text-muted">
                  Select a conversation to view messages
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
