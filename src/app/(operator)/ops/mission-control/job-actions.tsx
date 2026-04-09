"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveJobAction, rejectJobAction } from "./actions";

export function JobActions({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await rejectJobAction(jobId);
          })
        }
      >
        Reject
      </Button>
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await approveJobAction(jobId);
          })
        }
      >
        Approve
      </Button>
    </div>
  );
}
