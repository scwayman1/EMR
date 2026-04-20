import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell, type NavSection } from "@/components/shell/AppShell";
import {
  IconHome,
  IconClipboardCheck,
  IconBookOpen,
  IconSettings,
} from "@/components/shell/nav-icons";
import { ROLE_HOME } from "@/lib/rbac/roles";
import { QuoteWelcomeModal } from "@/components/ui/quote-of-the-day";
import { BreathingBreak } from "@/components/ui/breathing-break";
import { KeyboardShortcuts } from "@/components/ui/keyboard-shortcuts";
import { CommandPalette } from "@/components/ui/command-palette";
import { prisma } from "@/lib/db/prisma";
import {
  computeApprovalsBadge,
  computeLabsBadge,
  computeRefillsBadge,
} from "@/lib/domain/nav-badges";
import {
  getActiveAgentActivity,
  indexActivityByHref,
} from "@/lib/domain/nav-agent-activity";

export default async function ClinicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roles.some((r) => r === "clinician" || r === "practice_owner")) {
    const primary = user.roles[0];
    redirect(ROLE_HOME[primary] ?? "/");
  }

  const safeCount = async (fn: () => Promise<number>) => {
    try {
      return await fn();
    } catch (err) {
      console.error("[clinician-layout] count failed, defaulting to 0:", err);
      return 0;
    }
  };

  const activityIndex = indexActivityByHref(
    user.organizationId
      ? await getActiveAgentActivity(user.organizationId)
      : [],
  );

  const [
    pendingCount,
    emergencyCount,
    labsPendingCount,
    labsAbnormalCount,
    refillsPendingCount,
  ] = await (async () => {
    const orgId = user.organizationId;
    if (!orgId) return [0, 0, 0, 0, 0] as const;
    return Promise.all([
      safeCount(() =>
        prisma.message.count({
          where: {
            status: "draft",
            aiDrafted: true,
            thread: { patient: { organizationId: orgId } },
          },
        })
      ),
      safeCount(() =>
        prisma.message.count({
          where: {
            status: "draft",
            aiDrafted: true,
            thread: {
              triageUrgency: "emergency",
              patient: { organizationId: orgId },
            },
          },
        })
      ),
      safeCount(() =>
        prisma.labResult.count({
          where: { organizationId: orgId, signedAt: null },
        })
      ),
      safeCount(() =>
        prisma.labResult.count({
          where: { organizationId: orgId, signedAt: null, abnormalFlag: true },
        })
      ),
      safeCount(() =>
        prisma.refillRequest.count({
          where: {
            organizationId: orgId,
            status: { in: ["new", "flagged"] },
            signedAt: null,
          },
        })
      ),
    ]);
  })();

  const sections: NavSection[] = [
    {
      label: "Today",
      pillar: "today",
      icon: IconHome,
      items: [
        { label: "Today", href: "/clinic" },
        { label: "Command Center", href: "/clinic/command" },
        { label: "Roster", href: "/clinic/patients" },
        { label: "Inbox", href: "/clinic/messages" },
      ],
    },
    {
      label: "Review",
      icon: IconClipboardCheck,
      items: [
        {
          label: "Approvals",
          href: "/clinic/approvals",
          badge: computeApprovalsBadge({ pendingCount, emergencyCount }),
        },
        {
          label: "Labs",
          href: "/clinic/labs-review",
          badge: computeLabsBadge({
            unsignedCount: labsPendingCount,
            abnormalCount: labsAbnormalCount,
          }),
        },
        {
          label: "Refills",
          href: "/clinic/refills",
          badge: computeRefillsBadge({ pendingCount: refillsPendingCount }),
        },
      ],
    },
    {
      label: "Reference",
      icon: IconBookOpen,
      items: [
        { label: "Providers", href: "/clinic/providers" },
        { label: "Research", href: "/clinic/research" },
        { label: "Library", href: "/clinic/library" },
      ],
      defaultCollapsed: true,
    },
    {
      label: "Admin",
      icon: IconSettings,
      items: [
        { label: "Audit", href: "/clinic/audit-trail" },
        { label: "Brief", href: "/clinic/morning-brief" },
      ],
      defaultCollapsed: true,
    },
  ];

  for (const section of sections) {
    for (const item of section.items) {
      const hit = activityIndex[item.href];
      if (hit) item.activity = hit;
    }
  }

  return (
    <AppShell
      user={user}
      activeRole="clinician"
      sections={sections}
      roleLabel="Provider"
    >
      <QuoteWelcomeModal userName={user.firstName} />
      <BreathingBreak />
      <KeyboardShortcuts />
      <CommandPalette role="clinician" />
      {children}
    </AppShell>
  );
}
