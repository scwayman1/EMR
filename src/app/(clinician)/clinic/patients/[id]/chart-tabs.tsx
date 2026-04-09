"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { key: "summary", label: "Summary" },
  { key: "timeline", label: "Timeline" },
  { key: "notes", label: "Notes" },
  { key: "documents", label: "Documents" },
  { key: "outcomes", label: "Outcomes" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

export function ChartTabs({ patientId }: { patientId: string }) {
  const searchParams = useSearchParams();
  const active = (searchParams.get("tab") as TabKey) || "summary";

  return (
    <nav className="flex items-center gap-1 border-b border-border mb-8" aria-label="Chart sections">
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Link
            key={tab.key}
            href={`/clinic/patients/${patientId}?tab=${tab.key}`}
            scroll={false}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors rounded-t-md",
              isActive
                ? "text-accent"
                : "text-text-muted hover:text-text hover:bg-surface-muted"
            )}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

