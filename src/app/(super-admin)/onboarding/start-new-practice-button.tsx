"use client";

// "Start a new practice" CTA. POSTs to the configs API (EMR-435) and
// redirects into the wizard with the new draft ID. Lives as its own client
// island so the rest of the dashboard can stay server-rendered.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function StartNewPracticeButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        // EMR-435 owns this endpoint. Contract: POST /api/configs returns
        // `{ id: string }` for the new draft.
        const res = await fetch("/api/configs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error(`Failed to create draft (${res.status})`);
        const data = (await res.json()) as { id?: string };
        if (!data.id) throw new Error("API did not return a draft id");
        router.push(`/onboarding/wizard/${data.id}`);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="primary" size="sm" onClick={handleClick} disabled={pending}>
        {pending ? "Creating..." : "Start a new practice"}
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
