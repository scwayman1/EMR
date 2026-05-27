import { Suspense } from "react";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import { SplitWorkspaceClient } from "./SplitWorkspaceClient";

export const metadata = { title: "Split workspace" };

/**
 * EMR-028: split-window workspace. Up to 3 internal pages side-by-side
 * — chart + research + messages, etc. URL is the source of truth for
 * which panes are open, so layouts are bookmarkable and shareable.
 */
export default async function SplitWorkspacePage() {
  await requireRole("clinician");

  return (
    <PageShell maxWidth="max-w-[1600px]">
      <div className="mb-5">
        <Eyebrow className="mb-2">Workspace</Eyebrow>
        <h1 className="font-display text-2xl md:text-3xl text-text tracking-tight">
          Split workspace
        </h1>
        <p className="text-sm text-text-muted mt-1.5 max-w-2xl leading-relaxed">
          Open up to three views side-by-side. Pull a chart, the research panel,
          and your inbox into one screen so you stop bouncing tabs.
        </p>
      </div>
      {/* Suspense boundary required by Next 14 for useSearchParams. */}
      <Suspense fallback={<div className="h-[480px] rounded-xl border border-border bg-surface" />}>
        <SplitWorkspaceClient />
      </Suspense>
    </PageShell>
  );
}
