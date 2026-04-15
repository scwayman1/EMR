import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { ROLE_HOME } from "@/lib/rbac/roles";

const OPS_NAV: NavItem[] = [
  { label: "Overview", href: "/ops" },
  { label: "Mission Control", href: "/ops/mission-control" },
  { label: "Schedule", href: "/ops/schedule" },
  { label: "Patients", href: "/ops/patients" },
  { label: "Billing", href: "/ops/billing" },
  { label: "Scrub", href: "/ops/scrub" },
  { label: "Denials", href: "/ops/denials" },
  { label: "Aging", href: "/ops/aging" },
  { label: "Agents", href: "/ops/billing-agents" },
  { label: "Revenue", href: "/ops/revenue" },
  { label: "Eligibility", href: "/ops/eligibility" },
  { label: "Practice launch", href: "/ops/launch" },
  { label: "Analytics", href: "/ops/analytics" },
  { label: "Population", href: "/ops/population" },
  { label: "AI Config", href: "/ops/settings/ai-config" },
  { label: "Intake Builder", href: "/ops/intake-builder" },
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
    <AppShell user={user} activeRole="operator" nav={OPS_NAV} roleLabel="Practice ops">
      {children}
    </AppShell>
  );
}
