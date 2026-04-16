import { formatRelative } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";

export interface BubbleMessage {
  id: string;
  body: string;
  createdAt: Date;
  sentAt: Date | null;
  aiDrafted: boolean;
  status: "draft" | "sent" | "read";
  authorLabel: string;
  isMine: boolean;
}

/**
 * Single message rendered in a thread. The visual side (left/right)
 * is driven by isMine; the author label + timestamp are always
 * above the bubble. Agent-drafted messages carry an explicit
 * "AI draft" badge.
 */
export function MessageBubble({ message }: { message: BubbleMessage }) {
  const side = message.isMine ? "items-end" : "items-start";
  const bubble = message.isMine
    ? "bg-accent text-white"
    : "bg-surface-muted text-text border border-border";

  return (
    <li className={`flex flex-col gap-1 ${side}`}>
      <div className="flex items-center gap-2 text-xs text-text-subtle">
        <span>{message.authorLabel}</span>
        {message.aiDrafted && (
          <Badge tone="info" className="text-[10px]">
            AI draft
          </Badge>
        )}
        <span className="tabular-nums">
          {formatRelative(message.sentAt ?? message.createdAt)}
        </span>
      </div>
      <div
        className={`rounded-lg px-4 py-2.5 max-w-[80%] whitespace-pre-wrap leading-relaxed text-sm ${bubble}`}
      >
        {message.body}
      </div>
    </li>
  );
}
