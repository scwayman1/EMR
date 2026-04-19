import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import type { AuthedUser } from "@/lib/auth/session";
import { Tile } from "@/components/ui/tile";
import { EmptyState } from "@/components/ui/empty-state";
import { TileErrorBody } from "@/components/command/tile-error";
import {
  triageThread,
  type MessagePriority,
} from "@/lib/domain/smart-inbox";
import {
  loadMessagesEnrichment,
  type MessagesEnrichment,
} from "@/components/command/messages-card-data";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * Messages tile — AI-triaged inbox preview.
 *
 * Design intent (from the Mission Control sketch):
 *   - Each row shows a 10-ish-word AI summary of the thread.
 *   - Urgent threads float to the top and render in red so they're
 *     impossible to miss.
 *   - Click a row → Smart Inbox (we don't deep-link to a specific
 *     thread yet because the inbox uses internal state, not URL
 *     params — a follow-up PR can add that).
 *
 * Enrichment layer (mirrors the Schedule tile):
 *   - Sentiment emoji from the latest mood check-in, inline before the
 *     patient name, so you feel the patient before you read the summary.
 *   - Chip row under the summary: urgent / concern / refill / unsigned
 *     lab signals, using the same tones as the Schedule tile.
 *   - Hover peek popover to the right of the row: full dossier view
 *     (name/age, priority reason, full summary, all chips, Smart Inbox
 *     cue). Pure CSS group-hover — no client JS.
 *
 * Scope rules for this slice:
 *   - Reuses the existing triage logic from src/lib/domain/smart-inbox
 *     so the tile and the full inbox agree on priority/category.
 *   - Top 6 threads by priority (urgent > high > routine > low), then
 *     by recency within each priority bucket.
 *   - Zero schema changes; MessageThread already has triageSummary /
 *     triageUrgency columns, and for untriaged threads we fall back
 *     to the keyword-based triageThread() helper.
 */

const PRIORITY_RANK: Record<MessagePriority, number> = {
  urgent: 0,
  high: 1,
  routine: 2,
  low: 3,
};

const PRIORITY_DOT: Record<MessagePriority, string> = {
  urgent: "bg-red-500 animate-pulse",
  high: "bg-amber-500",
  routine: "bg-accent",
  low: "bg-border-strong/50",
};

const PRIORITY_REASON: Record<MessagePriority, string> = {
  urgent: "Urgent — keyword triage surfaced a red-flag symptom.",
  high: "High priority — patient-initiated and clinically relevant.",
  routine: "Routine follow-up or administrative question.",
  low: "Low priority — informational or resolved.",
};

const URGENT_ROW =
  "bg-red-50/60 hover:bg-red-50 border-red-200/60 hover:border-red-300";
const DEFAULT_ROW =
  "bg-surface hover:bg-surface-muted border-border/70 hover:border-border-strong/60";

export async function MessagesTile({ user }: { user: AuthedUser }) {
  if (!user.organizationId) {
    return <MessagesTileShell count={0} urgentCount={0} />;
  }

  try {
    return await renderMessagesTile(user.organizationId);
  } catch (err) {
    // Keep the Command Center usable if messaging or triage explodes —
    // log the stack for Render logs and show a calm fallback body.
    console.error("[command-center] MessagesTile render failed:", err);
    return (
      <MessagesTileShell count={0} urgentCount={0}>
        <TileErrorBody label="the messages inbox" error={err} />
      </MessagesTileShell>
    );
  }
}

async function renderMessagesTile(organizationId: string) {
  const threads = await prisma.messageThread.findMany({
    where: { patient: { organizationId } },
    orderBy: { lastMessageAt: "desc" },
    include: {
      patient: {
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 10, // enough for triage to consider recent activity
      },
    },
    take: 25, // triage then pick the top 6
  });

  const triaged = threads.map((t) => {
    const result = triageThread(
      t.messages.map((m) => ({
        body: m.body,
        senderUserId: m.senderUserId,
        senderAgent: m.senderAgent,
        createdAt: m.createdAt.toISOString(),
      })),
      t.patient.userId
    );

    const latestPatientMsg = t.messages.find(
      (m) =>
        m.senderUserId === t.patient.userId ||
        (!m.senderUserId && !m.senderAgent)
    );

    // Prefer the persisted AI summary when it exists; otherwise truncate
    // the most recent patient message as a stand-in preview.
    const summary =
      t.triageSummary?.trim() ||
      (latestPatientMsg
        ? truncate(latestPatientMsg.body, 110)
        : t.subject);

    return {
      id: t.id,
      subject: t.subject,
      patientName: `${t.patient.firstName} ${t.patient.lastName}`,
      patientId: t.patient.id,
      dateOfBirth: t.patient.dateOfBirth,
      lastMessageAt: t.lastMessageAt,
      summary,
      priority: result.priority,
    };
  });

  // Sort by priority then recency, and take the top 6 for the tile.
  triaged.sort((a, b) => {
    const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (rank !== 0) return rank;
    return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
  });

  const top = triaged.slice(0, 6);
  const urgentCount = triaged.filter((t) => t.priority === "urgent").length;

  // One batched enrichment call for all visible patients — 5 queries
  // total regardless of how many rows are on screen.
  const patientIds = Array.from(new Set(top.map((t) => t.patientId)));
  const enrichment = await loadMessagesEnrichment(patientIds);

  return (
    <MessagesTileShell count={triaged.length} urgentCount={urgentCount}>
      {top.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <EmptyState
            title="Inbox is quiet"
            description="No messages waiting. A rare gift."
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5 h-full overflow-y-auto pr-1">
          {top.map((t) => (
            <MessageRow
              key={t.id}
              thread={t}
              enrichment={enrichment.get(t.patientId)}
            />
          ))}
        </ul>
      )}
    </MessagesTileShell>
  );
}

type TriagedThread = {
  id: string;
  subject: string;
  patientName: string;
  patientId: string;
  dateOfBirth: Date | null;
  lastMessageAt: Date;
  summary: string;
  priority: MessagePriority;
};

function MessageRow({
  thread,
  enrichment,
}: {
  thread: TriagedThread;
  enrichment: MessagesEnrichment | undefined;
}) {
  const chips = enrichment?.chips ?? [];
  const sentiment = enrichment?.sentiment ?? null;

  return (
    <li className="relative group/row">
      <Link
        href="/clinic/messages"
        className={cn(
          "group block rounded-lg border px-3 py-2.5 transition-all",
          thread.priority === "urgent" ? URGENT_ROW : DEFAULT_ROW
        )}
      >
        <div className="flex items-start gap-2.5">
          <span
            aria-label={`${thread.priority} priority`}
            className={cn(
              "shrink-0 mt-1.5 h-2 w-2 rounded-full",
              PRIORITY_DOT[thread.priority]
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 justify-between">
              <p
                className={cn(
                  "text-sm font-medium truncate",
                  thread.priority === "urgent"
                    ? "text-red-900"
                    : "text-text group-hover:text-accent transition-colors"
                )}
              >
                {sentiment && (
                  <span
                    aria-hidden="true"
                    className="mr-1 text-base leading-none align-[-1px]"
                    title={
                      enrichment?.moodValue != null
                        ? `Latest mood check-in: ${enrichment.moodValue}/10`
                        : undefined
                    }
                  >
                    {sentiment}
                  </span>
                )}
                {thread.patientName}
              </p>
              <span className="text-[10px] tabular-nums text-text-subtle shrink-0">
                {formatRelative(thread.lastMessageAt)}
              </span>
            </div>
            <p
              className={cn(
                "text-xs mt-0.5 line-clamp-2",
                thread.priority === "urgent"
                  ? "text-red-800/90"
                  : "text-text-muted"
              )}
            >
              {thread.summary}
            </p>
            {chips.length > 0 && (
              <div className="mt-1.5">
                <ChipRow chips={chips} />
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Hover peek. Renders to the right of the row so it doesn't cover
          the row beneath it. The enclosing <ul> has overflow-y auto, but
          the popover uses z-40 to stack above neighbors inside the tile. */}
      <MessagesPeek thread={thread} enrichment={enrichment} />
    </li>
  );
}

function ChipRow({ chips }: { chips: MessagesEnrichment["chips"] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {chips.slice(0, 4).map((chip, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border leading-none",
            chip.tone === "danger" && "bg-red-50 text-red-900 border-red-200/70",
            chip.tone === "warn" && "bg-amber-50 text-amber-900 border-amber-200/70",
            chip.tone === "info" && "bg-[color:var(--info-soft)]/60 text-[color:var(--info)] border-[color:var(--info)]/20",
            chip.tone === "success" && "bg-[color:var(--success-soft)]/60 text-[color:var(--success)] border-[color:var(--success)]/20"
          )}
          title={chip.label}
        >
          <span aria-hidden="true">{chip.emoji}</span>
          <span className="truncate max-w-[100px]">{chip.label}</span>
        </span>
      ))}
      {chips.length > 4 && (
        <span className="text-[10px] text-text-subtle">
          +{chips.length - 4}
        </span>
      )}
    </div>
  );
}

/**
 * Hover preview popover. Same CSS-only hover pattern SchedulePeek uses —
 * no state, no JS. Anchors to the right of the row so a long list of
 * rows doesn't cover the row beneath with the popover for the row above.
 */
function MessagesPeek({
  thread,
  enrichment,
}: {
  thread: TriagedThread;
  enrichment: MessagesEnrichment | undefined;
}) {
  const age = computeAge(thread.dateOfBirth);
  const chips = enrichment?.chips ?? [];
  return (
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-40 top-0 left-full ml-2 w-80 max-w-[calc(100vw-2rem)]",
        "rounded-xl border border-border bg-surface shadow-lg p-4",
        "opacity-0 translate-x-1 transition-all duration-150",
        "group-hover/row:opacity-100 group-hover/row:translate-x-0 group-hover/row:pointer-events-auto",
        "group-focus-within/row:opacity-100 group-focus-within/row:translate-x-0 group-focus-within/row:pointer-events-auto"
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-text-subtle font-medium">
        Pre-response brief
      </p>
      <p className="text-sm font-medium text-text mt-1">
        {enrichment?.sentiment && (
          <span aria-hidden="true" className="mr-1 text-base align-[-1px]">
            {enrichment.sentiment}
          </span>
        )}
        {thread.patientName}
        {age != null && (
          <span className="ml-1.5 text-text-subtle font-normal text-xs">
            · {age}y
          </span>
        )}
      </p>
      <p className="text-[11px] text-text-subtle tabular-nums mt-0.5">
        {formatRelative(thread.lastMessageAt)} · {thread.subject}
      </p>

      <p
        className={cn(
          "text-xs mt-3 leading-relaxed",
          thread.priority === "urgent" ? "text-red-900" : "text-text-muted"
        )}
      >
        <span className="font-medium text-text">Why. </span>
        {PRIORITY_REASON[thread.priority]}
      </p>

      <p className="text-xs text-text-muted mt-3 leading-relaxed">
        <span className="font-medium text-text">Summary. </span>
        {thread.summary}
      </p>

      {enrichment?.observationSummary && (
        <p className="text-[11px] italic text-text-muted mt-3 leading-relaxed border-l-2 border-accent/30 pl-2">
          {enrichment.observationSummary}
        </p>
      )}

      {chips.length > 0 && (
        <div className="mt-3">
          <ChipRow chips={chips} />
        </div>
      )}

      <p className="text-[10px] text-text-subtle mt-3 text-right">
        Open in Smart Inbox →
      </p>
    </div>
  );
}

function MessagesTileShell({
  count,
  urgentCount,
  children,
}: {
  count: number;
  urgentCount: number;
  children?: React.ReactNode;
}) {
  const action = (
    <Link
      href="/clinic/messages"
      className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
    >
      Smart Inbox →
    </Link>
  );

  // Tile title reflects the state: urgent count first when non-zero,
  // otherwise thread count or the quiet default.
  const title =
    urgentCount > 0
      ? `${urgentCount} urgent`
      : count > 0
        ? `${count} thread${count === 1 ? "" : "s"}`
        : "Messages";

  return (
    <Tile
      eyebrow="Inbox"
      title={title}
      icon="💬"
      span="1x2"
      tone={urgentCount > 0 ? "default" : "warm"}
      action={action}
    >
      {children}
    </Tile>
  );
}

function computeAge(dob: Date | null): number | null {
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}
