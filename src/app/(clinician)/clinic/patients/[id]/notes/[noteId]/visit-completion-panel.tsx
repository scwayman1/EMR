import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type {
  VisitCompletionBundle,
  VisitCompletionItem,
  VisitCompletionTone,
} from "@/lib/domain/visit-completion";

interface VisitCompletionPanelProps {
  bundle: VisitCompletionBundle;
}

const toneDot: Record<VisitCompletionTone, string> = {
  neutral: "bg-accent/70",
  warning: "bg-highlight",
  alert: "bg-danger",
};

const toneBadge: Record<VisitCompletionTone, "neutral" | "warning" | "danger"> = {
  neutral: "neutral",
  warning: "warning",
  alert: "danger",
};

export function VisitCompletionPanel({ bundle }: VisitCompletionPanelProps) {
  return (
    <Card tone="raised" className="mt-8 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col gap-5 border-b border-border/70 bg-gradient-to-r from-accent-soft via-surface to-surface px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {bundle.sectionLabel}
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-text md:text-3xl">
              {bundle.heading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              Based on the finalized note, active problems, patient history, and practice
              patterns. Review the bundle, then approve, remove, edit, or send work to staff.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 lg:items-end">
            <Button size="md" disabled={!bundle.releaseEnabled}>
              {bundle.primaryActionLabel}
            </Button>
            <p className="max-w-[260px] text-left text-xs leading-relaxed text-text-muted lg:text-right">
              {bundle.summary}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-4">
          {bundle.cards.map((card) => (
            <article
              key={card.id}
              className="flex min-h-[250px] flex-col overflow-hidden rounded-lg border border-border/80 bg-surface"
            >
              <div className="border-b border-border/60 px-4 py-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-text">{card.title}</h3>
                  {card.items.some((item) => item.tone !== "neutral") && (
                    <Badge
                      tone={card.items.some((item) => item.tone === "alert") ? "danger" : "warning"}
                    >
                      Review
                    </Badge>
                  )}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                  {card.subtitle}
                </p>
              </div>

              <ul className="flex-1 space-y-3 px-4 py-4">
                {card.items.map((item) => (
                  <VisitCompletionLine key={item.id} item={item} />
                ))}
              </ul>

              <div className="flex flex-wrap gap-2 px-4 pb-4">
                {card.actions.map((action) => (
                  <Button
                    key={action.id}
                    size="sm"
                    variant={action.variant === "primary" ? "secondary" : "ghost"}
                    className={cn(
                      "h-8 rounded-full px-3 text-xs",
                      action.variant === "primary" &&
                        "border-accent/25 bg-accent-soft text-accent hover:bg-accent-soft",
                    )}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mx-5 mb-5 flex flex-col gap-3 rounded-lg border border-highlight/35 bg-highlight-soft px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-text">Physician remains in control.</p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              AI prepares the next actions; nothing is sent, ordered, billed, or assigned
              until the care plan is released.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              Learns from approvals, edits, removals, and deferrals.
            </p>
          </div>
          <Button size="sm" variant="highlight" className="shrink-0">
            {bundle.supportActionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function VisitCompletionLine({ item }: { item: VisitCompletionItem }) {
  return (
    <li className="grid grid-cols-[14px_1fr] gap-2 text-sm leading-relaxed text-text">
      <span
        className={cn("mt-2 h-2 w-2 rounded-full", toneDot[item.tone])}
        aria-hidden="true"
      />
      <span>
        {item.label}
        {item.reason && item.tone !== "neutral" && (
          <Badge tone={toneBadge[item.tone]} className="ml-2 align-middle">
            Source
          </Badge>
        )}
      </span>
    </li>
  );
}
