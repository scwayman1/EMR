import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell, type NavSection } from "@/components/shell/AppShell";
import {
  IconLayoutGrid,
  IconDollar,
  IconUsers,
  IconBuilding,
  IconChart,
  IconServer,
} from "@/components/shell/nav-icons";
import { CommandPalette } from "@/components/ui/command-palette";
import { ROLE_HOME } from "@/lib/rbac/roles";
import { prisma } from "@/lib/db/prisma";
import {
  computeAgingBadge,
  computeDenialsBadge,
} from "@/lib/domain/nav-badges";
import {
  getActiveAgentActivity,
  indexActivityByHref,
} from "@/lib/domain/nav-agent-activity";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_HOUR = 1000 * 60 * 60;
const APPEAL_WINDOW_DAYS = 90;

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const allowed = user.roles.some(
    (r) => r === "operator" || r === "practice_owner" || r === "system"
  );
  if (!allowed) {
    const primary = user.roles[0];
    redirect(ROLE_HOME[primary] ?? "/");
  }

  if (!user.organizationId) {
    redirect("/login");
  }

  const orgId = user.organizationId;

  const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      console.error("[operator-layout] badge load failed:", err);
      return fallback;
    }
  };

  const [denialsState, agingState] = await Promise.all([
    safe(
      async () => {
        const denials = await prisma.denialEvent.findMany({
          where: {
            resolution: "pending",
            claim: { organizationId: orgId },
          },
          select: { createdAt: true },
        });
        const now = Date.now();
        let oldestDays: number | null = null;
        let minHoursToDeadline: number | null = null;
        for (const d of denials) {
          const ageDays = Math.floor((now - d.createdAt.getTime()) / MS_PER_DAY);
          if (oldestDays === null || ageDays > oldestDays) oldestDays = ageDays;
          const deadlineMs =
            d.createdAt.getTime() + APPEAL_WINDOW_DAYS * MS_PER_DAY;
          const hoursLeft = (deadlineMs - now) / MS_PER_HOUR;
          if (hoursLeft >= 0) {
            if (minHoursToDeadline === null || hoursLeft < minHoursToDeadline) {
              minHoursToDeadline = hoursLeft;
            }
          }
        }
        return {
          unresolvedCount: denials.length,
          oldestDays,
          criticalDeadlineHours: minHoursToDeadline,
        };
      },
      { unresolvedCount: 0, oldestDays: null, criticalDeadlineHours: null }
    ),
    safe(
      async () => {
        const cutoff = new Date(Date.now() - 30 * MS_PER_DAY);
        const claims = await prisma.claim.findMany({
          where: {
            organizationId: orgId,
            status: { notIn: ["written_off", "paid", "voided"] },
            serviceDate: { lt: cutoff },
          },
          select: {
            billedAmountCents: true,
            paidAmountCents: true,
            serviceDate: true,
          },
        });
        const now = Date.now();
        let totalPastDueCents = 0;
        let oldestDays: number | null = null;
        for (const c of claims) {
          const balance = c.billedAmountCents - c.paidAmountCents;
          if (balance <= 0) continue;
          totalPastDueCents += balance;
          const ageDays = Math.floor(
            (now - c.serviceDate.getTime()) / MS_PER_DAY
          );
          if (oldestDays === null || ageDays > oldestDays) oldestDays = ageDays;
        }
        return { totalPastDueCents, oldestDays };
      },
      { totalPastDueCents: 0, oldestDays: null as number | null }
    ),
  ]);

  const denialsBadge = computeDenialsBadge(denialsState);
  const agingBadge = computeAgingBadge(agingState);

  const activityIndex = indexActivityByHref(
    await getActiveAgentActivity(orgId),
  );

  const sections: NavSection[] = [
    {
      label: "Overview",
      pillar: "overview",
      icon: IconLayoutGrid,
      items: [
        { label: "Overview", href: "/ops" },
        { label: "Mission Control", href: "/ops/mission-control" },
        { label: "Schedule", href: "/ops/schedule" },
        { label: "Patients", href: "/ops/patients" },
        { label: "Command Center", href: "/clinic/command" },
      ],
    },
    {
      label: "Billing",
      icon: IconDollar,
      items: [
        { label: "Billing", href: "/ops/billing" },
        { label: "Scrub", href: "/ops/scrub" },
        { label: "Denials", href: "/ops/denials", badge: denialsBadge },
        { label: "Aging", href: "/ops/aging", badge: agingBadge },
        { label: "Agents", href: "/ops/billing-agents" },
        { label: "Revenue", href: "/ops/revenue" },
        { label: "Eligibility", href: "/ops/eligibility" },
      ],
    },
    {
      label: "Operations",
      icon: IconUsers,
      items: [
        { label: "Staff schedule", href: "/ops/staff-schedule" },
        { label: "Time clock", href: "/ops/time-clock" },
        { label: "Training", href: "/ops/training" },
        { label: "Policies", href: "/ops/policies" },
        { label: "Incidents", href: "/ops/incidents" },
        { label: "Supplies", href: "/ops/supplies" },
        { label: "Vendors", href: "/ops/vendors" },
        { label: "Feedback", href: "/ops/feedback" },
        { label: "Marketing", href: "/ops/marketing" },
        { label: "Announcements", href: "/ops/announcements" },
      ],
      defaultCollapsed: true,
    },
    {
      label: "Practice Setup",
      icon: IconBuilding,
      items: [
        { label: "Onboarding", href: "/ops/onboarding" },
        { label: "Practice launch", href: "/ops/launch" },
        { label: "Intake Builder", href: "/ops/intake-builder" },
        { label: "Export", href: "/ops/export" },
      ],
      defaultCollapsed: true,
    },
    {
      label: "Intelligence",
      icon: IconChart,
      items: [
        { label: "Analytics", href: "/ops/analytics" },
        { label: "Analytics Lab", href: "/ops/analytics-lab" },
        { label: "Population", href: "/ops/population" },
      ],
      defaultCollapsed: true,
    },
    {
      label: "System",
      icon: IconServer,
      items: [
        { label: "AI Config", href: "/ops/settings/ai-config" },
        { label: "Webhooks", href: "/ops/webhooks" },
        { label: "API keys", href: "/ops/api-keys" },
        { label: "Performance", href: "/ops/performance" },
        { label: "Feature flags", href: "/ops/feature-flags" },
        { label: "Backups", href: "/ops/backups" },
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
      activeRole="operator"
      sections={sections}
      roleLabel="Practice ops"
    >
      <CommandPalette role="operator" />
      {children}
    </AppShell>
  );
}
