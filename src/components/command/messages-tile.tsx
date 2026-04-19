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
      patient: { select: { id: true, userId: true, firstName: true, lastName: true } },
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
      patientName: `${t.patient.firstName} ${t.patient.lastName}`,
      patientId: t.patient.id,
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
            <li key={t.id}>
              <Link
                href="/clinic/messages"
                className={cn(
                  "group block rounded-lg border px-3 py-2.5 transition-all",
                  t.priority === "urgent" ? URGENT_ROW : DEFAULT_ROW
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    aria-label={`${t.priority} priority`}
                    className={cn(
                      "shrink-0 mt-1.5 h-2 w-2 rounded-full",
                      PRIORITY_DOT[t.priority]
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 justify-between">
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          t.priority === "urgent"
                            ? "text-red-900"
                            : "text-text group-hover:text-accent transition-colors"
                        )}
                      >
                        {t.patientName}
                      </p>
                      <span className="text-[10px] tabular-nums text-text-subtle shrink-0">
                        {formatRelative(t.lastMessageAt)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "text-xs mt-0.5 line-clamp-2",
                        t.priority === "urgent"
                          ? "text-red-800/90"
                          : "text-text-muted"
                      )}
                    >
                      {t.summary}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MessagesTileShell>
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

function truncate(s: string, max: number): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}
