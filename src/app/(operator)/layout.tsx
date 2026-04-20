import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell, type NavSection } from "@/components/shell/AppShell";
import { CommandPalette } from "@/components/ui/command-palette";
import { ROLE_HOME } from "@/lib/rbac/roles";
import { prisma } from "@/lib/db/prisma";
import {
  computeAgingBadge,
  computeDenialsBadge,
} from "@/lib/domain/nav-badges";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_HOUR = 1000 * 60 * 60;

// Standard 90-day appeal window from the date of denial. Real payer-specific
// rules vary; this is a conservative default the badge uses to estimate the
// "next appeal deadline" so we can flash critical when a claim is about to age
// out of its appeal window.
const APPEAL_WINDOW_DAYS = 90;

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Role check: only operators, practice owners, and system users
  const allowed = user.roles.some(
    (r) => r === "operator" || r === "practice_owner" || r === "system"
  );
  if (!allowed) {
    const primary = user.roles[0];
    redirect(ROLE_HOME[primary] ?? "/");
  }

  // Org isolation: user must have an active org membership.
  // All data queries downstream filter by user.organizationId,
  // so even if this check is bypassed, data access is scoped.
  if (!user.organizationId) {
    redirect("/login");
  }

  const orgId = user.organizationId;

  // Per-section state for semantic badges. Each load is wrapped — a missing
  // table or transient DB hiccup must never block the operator from logging
  // in. The nav silently degrades to "no badge" on failure.
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
          // Only count not-yet-elapsed deadlines for the "imminent" check.
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
        // Past-due = open claims older than 30 days with outstanding balance.
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

  // 3-tier IA for the operator console.
  //
  //   Tier 1 (always visible) — 5 daily-use items plus the Command Center
  //                             escape hatch into the clinician space.
  //   Tier 2 (collapsible)    — Billing (hot zone, expanded by default),
  //                             Operations, Practice Setup, Intelligence,
  //                             System (quiet by default).
  //   Tier 3 (⌘K palette)     — all 35 routes, searchable by name.
  //
  // Groups are verb-framed where possible ("Review", "Clear") so the operator
  // thinks "I'm clearing denials" rather than "I'm in the Billing tab".
  const sections: NavSection[] = [
    {
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
      items: [
        { label: "Billing", href: "/ops/billing" },
        { label: "Scrub", href: "/ops/scrub" },
        { label: "Denials", href: "/ops/denials", badge: denialsBadge },
        { label: "Aging", href: "/ops/aging", badge: agingBadge },
        { label: "Agents", href: "/ops/billing-agents" },
        { label: "Revenue", href: "/ops/revenue" },
        { label: "Eligibility", href: "/ops/eligibility" },
      ],
      // Hot zone — expanded on first visit.
    },
    {
      label: "Operations",
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
      items: [
        { label: "Analytics", href: "/ops/analytics" },
        { label: "Analytics Lab", href: "/ops/analytics-lab" },
        { label: "Population", href: "/ops/population" },
      ],
      defaultCollapsed: true,
    },
    {
      label: "System",
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
