"use client";

// EMR-660 — Resolve button. Sibling of smart-inbox.tsx to keep the merge
// surface small (see EMR-659 collision note in the PR body). Marks the
// thread as clinically dispositioned by appending a "[[RESOLVED]]" bubble
// via the resolveThread server action.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { resolveThread } from "./actions";

interface Props {
  threadId: string;
  /** Whether the thread already has a trailing resolved marker. When true the
   *  button renders as a passive "Resolved" pill. */
  isResolved: boolean;
}

export function ResolveButton({ threadId, isResolved }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  if (isResolved) {
    return (
      <span className="inline-flex items-center rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
        Resolved
      </span>
    );
  }

  const onClick = async () => {
    const ok = await confirm({
      title: "Mark this thread as resolved?",
      description:
        "It drops out of the inbox until the patient sends a new message.",
      severity: "info",
      confirmLabel: "Resolve",
    });
    if (!ok) return;
    const fd = new FormData();
    fd.set("threadId", threadId);
    startTransition(async () => {
      const result = await resolveThread(null, fd);
      if (result.ok) router.refresh();
      else window.alert(result.error);
    });
  };

  return (
    <Button variant="secondary" size="sm" onClick={onClick} disabled={pending}>
      {pending ? "Resolving…" : "Resolve"}
    </Button>
  );
}
