"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SplitWindow, type SplitPane } from "@/components/clinic/SplitWindow";
import { Button } from "@/components/ui/button";

/**
 * EMR-028: client wrapper around <SplitWindow>. Owns URL-as-state so a
 * provider can bookmark a split workspace ("/clinic/split?p1=...&p2=...")
 * and re-open it later, share it with a colleague, or have it survive a
 * tab refresh. Up to 3 panes max per the ticket spec.
 */

const MAX_PANES = 3;

const QUICK_OPEN: { label: string; url: string }[] = [
  { label: "Mission Control", url: "/clinic" },
  { label: "Inbox", url: "/clinic/messages" },
  { label: "Lab review", url: "/clinic/labs-review" },
  { label: "Refills", url: "/clinic/refills" },
  { label: "Approvals", url: "/clinic/approvals" },
  { label: "Research", url: "/clinic/research" },
  { label: "Library", url: "/clinic/library" },
  { label: "Morning brief", url: "/clinic/morning-brief" },
];

function panesFromSearch(params: URLSearchParams): SplitPane[] {
  const out: SplitPane[] = [];
  for (let i = 1; i <= MAX_PANES; i += 1) {
    const url = params.get(`p${i}`);
    if (url) out.push({ url });
  }
  return out;
}

function searchFromPanes(panes: SplitPane[]): string {
  const sp = new URLSearchParams();
  panes.slice(0, MAX_PANES).forEach((p, i) => {
    sp.set(`p${i + 1}`, p.url);
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function SplitWorkspaceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const panes = React.useMemo(
    () => panesFromSearch(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const setPanes = React.useCallback(
    (next: SplitPane[]) => {
      const limited = next.slice(0, MAX_PANES);
      router.replace(`/clinic/split${searchFromPanes(limited)}`, { scroll: false });
    },
    [router]
  );

  const addPane = (url: string) => {
    if (panes.length >= MAX_PANES) return;
    setPanes([...panes, { url }]);
  };

  const clearAll = () => setPanes([]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-text-subtle font-medium">
            Quick open
          </span>
          {QUICK_OPEN.map((q) => {
            const isOpen = panes.some((p) => p.url === q.url);
            const disabled = panes.length >= MAX_PANES && !isOpen;
            return (
              <button
                key={q.url}
                type="button"
                onClick={() => !isOpen && addPane(q.url)}
                disabled={disabled || isOpen}
                className={
                  "text-xs px-2.5 py-1 rounded-full border transition-colors " +
                  (isOpen
                    ? "border-accent/40 bg-accent-soft text-accent cursor-default"
                    : disabled
                      ? "border-border text-text-subtle cursor-not-allowed opacity-50"
                      : "border-border-strong/50 text-text-muted hover:border-accent hover:text-accent hover:bg-accent-soft/40")
                }
              >
                {isOpen ? "✓ " : "+ "}
                {q.label}
              </button>
            );
          })}
        </div>
        {panes.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear all
          </Button>
        )}
      </div>

      <p className="text-xs text-text-subtle">
        Up to {MAX_PANES} panes side-by-side. Drag the dividers to resize.
        Bookmark the URL to restore this layout later.
      </p>

      <SplitWindow panes={panes} onPanesChange={setPanes} suggestions={QUICK_OPEN} />
    </div>
  );
}
