import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import {
  LAUNCH_STEPS,
  type LaunchStepId,
  type OrgLaunchState,
} from "@/lib/domain/practice-launch";

/**
 * Horizontal timeline of launch steps rendered at the top of the
 * wizard page. Each step is a chip showing complete / current / pending
 * state with a click-through to its panel.
 */
export function LaunchTimeline({
  orgState,
  currentStepId,
}: {
  orgState: OrgLaunchState;
  currentStepId: LaunchStepId | null;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2 mb-8">
      {LAUNCH_STEPS.map((step, i) => {
        const complete = step.isComplete(orgState);
        const isCurrent = currentStepId === step.id;
        const tone = complete
          ? "complete"
          : isCurrent
            ? "current"
            : "pending";

        return (
          <li key={step.id} className="flex items-center gap-2">
            <Link
              href={`/ops/launch?step=${step.id}`}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                tone === "complete" &&
                  "bg-accent-soft text-accent border-accent/40 hover:bg-accent-soft/70",
                tone === "current" &&
                  "bg-highlight/10 text-highlight border-highlight/60 ring-1 ring-highlight/30",
                tone === "pending" &&
                  "bg-surface text-text-subtle border-border hover:text-text",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                  tone === "complete" && "bg-accent text-accent-ink",
                  tone === "current" && "bg-highlight text-white",
                  tone === "pending" && "bg-surface-muted text-text-subtle",
                )}
                aria-hidden
              >
                {tone === "complete" ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5L4 7L8 3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span>{step.title}</span>
            </Link>
            {i < LAUNCH_STEPS.length - 1 && (
              <span className="h-px w-4 bg-border-strong/40" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
