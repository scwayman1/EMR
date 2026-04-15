"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { AgentSignalCard } from "@/components/ui/agent-signal";
import { formatRelative } from "@/lib/utils/format";
import {
  approveMessageDraft,
  editAndApproveMessageDraft,
  rejectMessageDraft,
  type ApprovalResult,
} from "./actions";

// ---------------------------------------------------------------------------
// Types — generic enough that future approval kinds (note drafts, claim
// appeals, refund proposals) can plug in without reshaping the client.
// ---------------------------------------------------------------------------

export interface ApprovalItem {
  id: string;
  kind: "message_draft"; // future: "note_draft" | "appeal_draft" | "refund_proposal"
  agent: string | null;
  createdAt: string;
  body: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  // Message-draft-specific fields
  threadId: string;
  threadSubject: string;
  triageUrgency: "emergency" | "high" | "routine" | "low" | null;
  triageCategory: string | null;
  triageSummary: string | null;
  triageSafetyFlags: string[] | null;
}

// ---------------------------------------------------------------------------
// <ApprovalsInboxList /> — container
// ---------------------------------------------------------------------------

export function ApprovalsInboxList({ items }: { items: ApprovalItem[] }) {
  return (
    <div className="space-y-5">
      {items.map((item) => (
        <ApprovalCardRow key={item.id} item={item} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// <ApprovalCardRow /> — one draft, fully reviewable
// ---------------------------------------------------------------------------

function ApprovalCardRow({ item }: { item: ApprovalItem }) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(item.body);

  // Reset the local edit state when the server re-renders with new items
  useEffect(() => {
    setEditBody(item.body);
    setEditing(false);
  }, [item.id, item.body]);

  const kicker = `${item.patientFirstName} ${item.patientLastName} · "${item.threadSubject}"`;
  const headline = `Drafted reply for ${item.patientFirstName}`;

  const pills: string[] = [];
  if (item.triageCategory) pills.push(humanizeCategory(item.triageCategory));
  pills.push("Used patient chart");
  if (item.triageSafetyFlags && item.triageSafetyFlags.length > 0) {
    pills.push(`${item.triageSafetyFlags.length} safety flag${item.triageSafetyFlags.length === 1 ? "" : "s"}`);
  }

  return (
    <AgentSignalCard
      agent={item.agent}
      headline={headline}
      kicker={kicker}
      contextPills={pills}
      timestamp={formatRelative(item.createdAt)}
      urgency={item.triageUrgency}
      footer={
        <FooterDetail
          summary={item.triageSummary}
          safetyFlags={item.triageSafetyFlags}
          patientId={item.patientId}
        />
      }
      actions={
        editing ? (
          <EditApproveForm
            messageId={item.id}
            body={editBody}
            onCancel={() => {
              setEditing(false);
              setEditBody(item.body);
            }}
          />
        ) : (
          <ActionButtons
            messageId={item.id}
            onEdit={() => setEditing(true)}
          />
        )
      }
    >
      {editing ? (
        <Textarea
          value={editBody}
          onChange={(e) => setEditBody(e.target.value)}
          rows={Math.max(4, Math.min(12, item.body.split("\n").length + 2))}
          className="bg-surface"
        />
      ) : (
        item.body
      )}
    </AgentSignalCard>
  );
}

// ---------------------------------------------------------------------------
// Footer — summary + safety flags + jump-to-thread link
// ---------------------------------------------------------------------------

function FooterDetail({
  summary,
  safetyFlags,
  patientId,
}: {
  summary: string | null;
  safetyFlags: string[] | null;
  patientId: string;
}) {
  return (
    <div className="space-y-2">
      {summary && (
        <div className="text-[12px] text-text-muted leading-relaxed">
          <span className="text-[10px] uppercase tracking-wider text-text-subtle">
            Thread summary ·{" "}
          </span>
          {summary}
        </div>
      )}
      {safetyFlags && safetyFlags.length > 0 && (
        <div className="rounded-lg bg-danger/[0.06] border border-danger/25 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-danger mb-1">
            Safety flags
          </p>
          <ul className="space-y-0.5">
            {safetyFlags.map((f, i) => (
              <li key={i} className="text-[11px] text-danger leading-relaxed">
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="pt-1">
        <Link
          href={`/clinic/patients/${patientId}?tab=correspondence`}
          className="text-[11px] text-accent hover:underline"
        >
          Open full patient chart →
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action button groups
// ---------------------------------------------------------------------------

function ActionButtons({
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

  return (
    <div className="flex items-center gap-2">
      <form action={rejectAction}>
        <input type="hidden" name="messageId" value={messageId} />
        <RejectButton />
      </form>
      <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
        Edit
      </Button>
      <form action={approveAction}>
        <input type="hidden" name="messageId" value={messageId} />
        <ApproveButton />
      </form>
      {(approveState?.ok === false || rejectState?.ok === false) && (
        <span className="text-[11px] text-danger ml-2">
          {approveState?.ok === false
            ? approveState.error
            : rejectState?.ok === false
              ? rejectState.error
              : ""}
        </span>
      )}
    </div>
  );
}

function ApproveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Sending..." : "Approve & send"}
    </Button>
  );
}

function RejectButton() {
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

function EditApproveForm({
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
      <EditSubmitButton />
      {state?.ok === false && (
        <span className="text-[11px] text-danger ml-2">{state.error}</span>
      )}
    </form>
  );
}

function EditSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Sending..." : "Send edits"}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  symptom_report: "Symptom report",
  side_effect: "Side effect",
  refill_request: "Refill request",
  appointment_question: "Appointment",
  billing_question: "Billing",
  dosing_question: "Dosing",
  result_inquiry: "Lab/Result",
  general_question: "General",
  gratitude: "Gratitude",
  unknown: "Unclassified",
};

function humanizeCategory(raw: string): string {
  return CATEGORY_LABELS[raw] ?? raw;
}
