"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { markStepCompleteAction } from "./actions";

export function LaunchChecklist({ items }: { items: string[] }) {
  const [pending, startTransition] = useTransition();
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  function handleComplete(step: string) {
    // Optimistic: mark as completed locally immediately
    setCompletedItems((prev) => new Set(prev).add(step));
    startTransition(async () => {
      await markStepCompleteAction(step);
    });
  }

  return (
    <ul className="space-y-2">
      {items.map((s, i) => {
        const isDone = completedItems.has(s);
        return (
          <li
            key={i}
            className={`flex items-start gap-3 group rounded-lg p-2 -mx-2 transition-colors ${
              isDone ? "opacity-50" : "hover:bg-surface-muted/50"
            }`}
          >
            <button
              onClick={() => !isDone && handleComplete(s)}
              disabled={isDone || pending}
              className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                isDone
                  ? "bg-accent border-accent text-white"
                  : "border-border-strong/60 bg-surface hover:border-accent hover:bg-accent-soft"
              }`}
            >
              {isDone && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 5L4 7L8 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <span
              className={`text-sm leading-relaxed flex-1 ${
                isDone ? "line-through text-text-subtle" : "text-text-muted"
              }`}
            >
              {s}
            </span>
            {!isDone && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => handleComplete(s)}
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 !h-7 !px-2 !text-xs"
              >
                Mark complete
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
