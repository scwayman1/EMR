import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  AGENT_TONE,
  resolveAgentMeta,
  type AgentUIMeta,
} from "@/lib/agents/ui-registry";

/**
 * Agent presence primitives.
 *
 * Every place an AI agent touches a surface the clinician sees should use
 * ONE of two components from this file:
 *
 *   <AgentSignal />      — the inline chip. Attribution for a draft, a
 *                          suggestion, an auto-filled field. Hoverable.
 *
 *   <AgentSignalCard />  — the full review card. Used in approval queues
 *                          and anywhere the clinician needs to see the
 *                          agent's output, reasoning, and take action.
 *
 * Both components pull their display name, blurb, glyph, and tone from
 * `src/lib/agents/ui-registry.ts`, so adding a new agent is one entry and
 * every surface gets consistent presence.
 *
 * Design notes:
 * - These are server-component-safe. No client hooks.
 * - Attribution is never "AI" alone. Every signal names the specific agent.
 * - Hover reveals more; click opens review. We never hide agent activity.
 * - The Constitution (Article VI) requires agent actions be traceable. These
 *   primitives are how we honor that pledge in the UI layer.
 */

// ---------------------------------------------------------------------------
// <AgentAvatar />
// ---------------------------------------------------------------------------

export function AgentAvatar({
  meta,
  size = "sm",
  className,
}: {
  meta: AgentUIMeta;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const tone = AGENT_TONE[meta.tone];
  const sizeClass =
    size === "xs"
      ? "h-5 w-5 text-[10px]"
      : size === "sm"
        ? "h-7 w-7 text-[12px]"
        : "h-10 w-10 text-sm";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold shrink-0 shadow-sm",
        sizeClass,
        tone.avatarBg,
        tone.avatarText,
        className,
      )}
    >
      {meta.glyph}
    </span>
  );
}

// ---------------------------------------------------------------------------
// <AgentSignal />
// ---------------------------------------------------------------------------

export interface AgentSignalProps {
  /** The raw `senderAgent` value from a Message, or an agent key. */
  agent: string | null | undefined;
  /** Optional label override. Defaults to "Draft". */
  label?: string;
  /**
   * When true the chip renders with a hover-revealed popover showing the
   * agent's role and blurb. Defaults to true.
   */
  showPopover?: boolean;
  /** Extra classes for the outer chip. */
  className?: string;
}

export function AgentSignal({
  agent,
  label = "Draft",
  showPopover = true,
  className,
}: AgentSignalProps) {
  const meta = resolveAgentMeta(agent);
  const tone = AGENT_TONE[meta.tone];

  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full border text-[10px] font-medium group/agent align-middle",
        tone.chipBg,
        tone.chipText,
        tone.border,
        className,
      )}
    >
      <AgentAvatar meta={meta} size="xs" />
      <span className="leading-none tracking-wide">
        {meta.displayName} · {label}
      </span>

      {showPopover && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 left-0 top-full mt-2 w-64",
            "rounded-lg border bg-surface-raised p-3 shadow-lg",
            "opacity-0 -translate-y-1 group-hover/agent:opacity-100 group-hover/agent:translate-y-0",
            "transition-all duration-150 ease-smooth origin-top-left",
            tone.border,
          )}
        >
          <span className="flex items-start gap-2">
            <AgentAvatar meta={meta} size="sm" />
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-semibold text-text leading-tight">
                {meta.displayName}
              </span>
              <span className="block text-[10px] text-text-subtle uppercase tracking-wider mt-0.5">
                {meta.role}
              </span>
            </span>
          </span>
          <span className="block text-[11px] text-text-muted leading-relaxed mt-2">
            {meta.blurb}
          </span>
          <span className="block text-[9px] text-text-subtle italic mt-2 pt-2 border-t border-border/60">
            Every agent action is logged and approval-gated where patient
            safety is at stake. — Art. VI
          </span>
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// <AgentSignalCard />
// ---------------------------------------------------------------------------

export interface AgentSignalCardProps {
  /** Raw senderAgent string or agent key. */
  agent: string | null | undefined;
  /** One-line title describing what the agent did. e.g. "Drafted reply for Maya Johnson" */
  headline: string;
  /** Optional kicker text above the headline. e.g. the patient name or thread subject. */
  kicker?: string;
  /** Context pills shown under the headline — chips describing what the agent considered. */
  contextPills?: string[];
  /** Timestamp label — when the agent produced this artifact. e.g. "2 hours ago" */
  timestamp?: string;
  /** Optional urgency hint. Adds a left border and badge. */
  urgency?: "emergency" | "high" | "routine" | "low" | null;
  /**
   * The artifact itself — the draft message, note body, claim appeal, etc.
   * Rendered inside a nested "preview" frame.
   */
  children: React.ReactNode;
  /** Action area on the right — Approve / Edit / Reject buttons, typically. */
  actions?: React.ReactNode;
  /** Optional footer slot below the preview, above the actions (e.g. safety flags). */
  footer?: React.ReactNode;
  className?: string;
}

const URGENCY_BORDER: Record<string, string> = {
  emergency: "border-l-4 border-l-danger",
  high: "border-l-4 border-l-[color:var(--warning)]",
  routine: "border-l-4 border-l-accent/40",
  low: "border-l-4 border-l-success/30",
};

const URGENCY_LABEL: Record<string, { text: string; className: string }> = {
  emergency: {
    text: "EMERGENCY",
    className: "bg-danger/10 text-danger border border-danger/30",
  },
  high: {
    text: "High urgency",
    className:
      "bg-highlight-soft text-[color:var(--highlight-hover)] border border-highlight/30",
  },
  routine: {
    text: "Routine",
    className: "bg-accent-soft text-accent border border-accent/25",
  },
  low: {
    text: "Low",
    className:
      "bg-[color:var(--accent-soft)] text-success border border-[color:var(--success)]/25",
  },
};

export function AgentSignalCard({
  agent,
  headline,
  kicker,
  contextPills,
  timestamp,
  urgency,
  children,
  actions,
  footer,
  className,
}: AgentSignalCardProps) {
  const meta = resolveAgentMeta(agent);
  const tone = AGENT_TONE[meta.tone];
  const urgencyBorder = urgency ? URGENCY_BORDER[urgency] : "";
  const urgencyLabel = urgency ? URGENCY_LABEL[urgency] : null;

  return (
    <div
      className={cn(
        "rounded-xl border bg-surface shadow-sm overflow-hidden",
        tone.border,
        urgencyBorder,
        className,
      )}
    >
      {/* Header: agent attribution + what it did */}
      <div
        className={cn(
          "flex items-start gap-3 px-5 pt-4 pb-3 border-b border-border/60",
          tone.cardTint,
        )}
      >
        <AgentAvatar meta={meta} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-[0.12em] text-text-subtle">
              {meta.displayName}
            </span>
            <span className="text-text-subtle text-[11px]">·</span>
            <span className="text-[11px] text-text-subtle">{meta.role}</span>
            {urgencyLabel && (
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 ml-1",
                  urgencyLabel.className,
                )}
              >
                {urgencyLabel.text}
              </span>
            )}
            {timestamp && (
              <span className="text-[11px] text-text-subtle ml-auto shrink-0">
                {timestamp}
              </span>
            )}
          </div>
          {kicker && (
            <p className="text-xs text-text-subtle mt-0.5">{kicker}</p>
          )}
          <h3 className="font-display text-[17px] leading-snug text-text tracking-tight mt-1">
            {headline}
          </h3>
          {contextPills && contextPills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {contextPills.map((pill, i) => (
                <span
                  key={i}
                  className="inline-flex items-center text-[10px] text-text-muted bg-surface-muted border border-border-strong/40 rounded-full px-2 py-0.5"
                >
                  {pill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview: the artifact itself (children) */}
      <div className="px-5 py-4">
        <div className="rounded-lg bg-surface-muted/40 border border-border/60 px-4 py-3 text-[13.5px] text-text leading-relaxed whitespace-pre-wrap">
          {children}
        </div>
        {footer && <div className="mt-3">{footer}</div>}
      </div>

      {/* Actions */}
      {actions && (
        <div className="px-5 py-3 border-t border-border/60 bg-surface-muted/30 flex items-center justify-between gap-3">
          <span className="text-[11px] text-text-subtle italic">
            {meta.blurb}
          </span>
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        </div>
      )}
    </div>
  );
}
