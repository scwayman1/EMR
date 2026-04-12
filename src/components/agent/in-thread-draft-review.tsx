"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { AgentAvatar } from "@/components/ui/agent-signal";
import { resolveAgentMeta } from "@/lib/agents/ui-registry";
import {
  approveMessageDraft,
  editAndApproveMessageDraft,
  rejectMessageDraft,
  type ApprovalResult,
} from "@/app/(clinician)/clinic/approvals/actions";

/**
 * In-thread draft review.
 *
 * Renders directly beneath a draft message bubble (in the clinician's view
 * of a thread) so a physician can approve, edit, or discard Nurse Nora's
 * draft without leaving the conversation. Same server actions as the
 * /clinic/approvals page — this is just a second surface that brings the
 * action to the context.
 *
 * Why this component exists:
 *   - Before this, the only way to resolve a draft was to bounce to the
 *     approvals inbox. That's a context break and adds friction.
 *   - Per Scott's feedback: "embedded UX that shows a nurse could be
 *     answering messages, not just in approvals." The draft should be
 *     visible and actionable where the conversation lives.
 */

export interface InThreadDraftReviewProps {
  messageId: string;
  initialBody: string;
  agent: string | null;
  /** Optional class for the wrapper (mostly for alignment tweaks). */
  className?: string;
}

export function InThreadDraftReview({
  messageId,
  initialBody,
  agent,
  className,
}: InThreadDraftReviewProps) {
  const meta = resolveAgentMeta(agent);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(initialBody);

  // Reset if the underlying draft updates on the server.
  useEffect(() => {
    setBody(initialBody);
    setEditing(false);
  }, [messageId, initialBody]);

  return (
    <div
      className={`mt-2 rounded-lg border border-highlight/30 bg-highlight-soft/30 px-3 py-2.5 ${className ?? ""}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <AgentAvatar meta={meta} size="xs" />
        <span className="text-[11px] font-medium text-text">
          {meta.displayName}
        </span>
        <span className="text-[11px] text-text-subtle">
          · drafted a reply for your review
        </span>
      </div>

      {editing && (
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={Math.max(3, Math.min(10, body.split("\n").length + 1))}
          className="bg-surface mb-2"
        />
      )}

      <div className="flex items-center justify-end gap-2 flex-wrap">
        {editing ? (
          <EditingActions
            messageId={messageId}
            body={body}
            onCancel={() => {
              setEditing(false);
              setBody(initialBody);
            }}
          />
        ) : (
          <IdleActions
            messageId={messageId}
            onEdit={() => setEditing(true)}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Idle (non-editing) state — Discard / Edit / Approve & send
// ---------------------------------------------------------------------------

function IdleActions({
  messageId,
  onEdit,
}: {
  messageId: string;
  onEdit: () => void;
}) {
  const [approveState, approveAction] = useFormState<
    ApprovalResult | null,
    FormData
  >(approveMessageDraft, null);
  const [rejectState, rejectAction] = useFormState<
    ApprovalResult | null,
    FormData
  >(rejectMessageDraft, null);

  const errorText =
    approveState?.ok === false
      ? approveState.error
      : rejectState?.ok === false
        ? rejectState.error
        : null;

  return (
    <>
      <form action={rejectAction}>
        <input type="hidden" name="messageId" value={messageId} />
        <DiscardBtn />
      </form>
      <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
        Edit
      </Button>
      <form action={approveAction}>
        <input type="hidden" name="messageId" value={messageId} />
        <ApproveBtn />
      </form>
      {errorText && (
        <span className="text-[11px] text-danger w-full text-right">
          {errorText}
        </span>
      )}
    </>
  );
}

function ApproveBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Sending..." : "Approve & send"}
    </Button>
  );
}

function DiscardBtn() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant="ghost"
      disabled={pending}
      className="text-text-subtle hover:text-danger"
    >
      {pending ? "..." : "Discard"}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Editing state — Cancel / Send edits
// ---------------------------------------------------------------------------

function EditingActions({
  messageId,
  body,
  onCancel,
}: {
  messageId: string;
  body: string;
  onCancel: () => void;
}) {
  const [state, formAction] = useFormState<ApprovalResult | null, FormData>(
    editAndApproveMessageDraft,
    null,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="messageId" value={messageId} />
      <input type="hidden" name="body" value={body} />
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
      <EditSubmitBtn />
      {state?.ok === false && (
        <span className="text-[11px] text-danger ml-2">{state.error}</span>
      )}
    </form>
  );
}

function EditSubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Sending..." : "Send edits"}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// <DraftReadyBanner /> — optional header strip for the top of a thread
// ---------------------------------------------------------------------------
// Displayed above the messages area when a draft exists anywhere in the
// current thread. Gives the physician an immediate "heads up" before they
// scroll down. Not interactive — just a signal.

export function DraftReadyBanner({
  agent,
  draftCount,
}: {
  agent: string | null;
  draftCount: number;
}) {
  const meta = resolveAgentMeta(agent);
  return (
    <div className="flex items-center gap-2.5 px-5 py-2.5 border-b border-highlight/25 bg-highlight-soft/30">
      <AgentAvatar meta={meta} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-text leading-tight">
          <span className="font-medium">{meta.displayName}</span>{" "}
          {draftCount === 1
            ? "drafted a reply — review below to approve or edit."
            : `has ${draftCount} drafts in this thread — review each below.`}
        </p>
      </div>
    </div>
  );
}
