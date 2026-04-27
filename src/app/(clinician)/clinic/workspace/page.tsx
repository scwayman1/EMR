import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { WorkspaceSplit } from "./workspace-split";

export const metadata = { title: "Workspace" };

const QUICK_ROUTES: { label: string; href: string }[] = [
  { label: "Command Center", href: "/clinic/command" },
  { label: "Roster", href: "/clinic/patients" },
  { label: "Inbox", href: "/clinic/messages" },
  { label: "Approvals", href: "/clinic/approvals" },
  { label: "Labs", href: "/clinic/labs-review" },
  { label: "Refills", href: "/clinic/refills" },
  { label: "Research", href: "/clinic/research" },
  { label: "Library", href: "/clinic/library" },
];

/**
 * Multi-pane clinical workspace (EMR-028).
 *
 * Hosts up to 3 panes side-by-side, each pointing at any clinic route.
 * Built on the SplitPanels primitive so panes are drag-resizable and
 * sizes round-trip through localStorage.
 */
export default async function WorkspacePage() {
  await requireUser();

  return (
    <PageShell>
      <PageHeader
        title="Workspace"
        description="Open up to three views side-by-side. Drag the dividers to resize."
      />
      <WorkspaceSplit routes={QUICK_ROUTES} />
    </PageShell>
  );
}
