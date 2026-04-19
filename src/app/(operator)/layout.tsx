import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell, type NavSection } from "@/components/shell/AppShell";
import { CommandPalette } from "@/components/ui/command-palette";
import { ROLE_HOME } from "@/lib/rbac/roles";

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
const OPS_SECTIONS: NavSection[] = [
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
      { label: "Denials", href: "/ops/denials" },
      { label: "Aging", href: "/ops/aging" },
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

  return (
    <AppShell
      user={user}
      activeRole="operator"
      sections={OPS_SECTIONS}
      roleLabel="Practice ops"
    >
      <CommandPalette role="operator" />
      {children}
    </AppShell>
  );
}
