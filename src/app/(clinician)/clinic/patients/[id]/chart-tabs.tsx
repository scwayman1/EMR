"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { key: "demographics", label: "Demographics", dot: "bg-[color:var(--info)]" },
  { key: "records", label: "Records", dot: "bg-accent" },
  { key: "images", label: "Images", dot: "bg-[color:var(--info)]" },
  { key: "labs", label: "Labs", dot: "bg-[color:var(--success)]" },
  { key: "notes", label: "Notes", dot: "bg-[color:var(--highlight)]" },
  { key: "correspondence", label: "Correspondence", dot: "bg-[color:var(--info)]" },
  { key: "rx", label: "Cannabis Rx", dot: "bg-[color:var(--highlight)]" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

interface ChartTabsProps {
  patientId: string;
  counts: Record<TabKey, number>;
}

export function ChartTabs({ patientId, counts }: ChartTabsProps) {
  const searchParams = useSearchParams();
  const active = (searchParams.get("tab") as TabKey) || "records";

  return (
    <nav
      className="flex items-center gap-1 border-b border-border mb-8 overflow-x-auto"
      aria-label="Chart sections"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        const count = counts[tab.key];
        return (
          <Link
            key={tab.key}
            href={`/clinic/patients/${patientId}?tab=${tab.key}`}
            scroll={false}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors rounded-t-md whitespace-nowrap",
              isActive
                ? "text-accent"
                : "text-text-muted hover:text-text hover:bg-surface-muted"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                isActive ? tab.dot : "bg-border-strong/50"
              )}
            />
            {tab.label}
            <span
              className={cn(
                "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-medium rounded-full tabular-nums",
                isActive
                  ? "bg-accent-soft text-accent"
                  : "bg-surface-muted text-text-subtle"
              )}
            >
              {count}
            </span>
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
