import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { ROLE_HOME } from "@/lib/rbac/roles";

const OPS_NAV: NavItem[] = [
  { label: "Overview", href: "/ops" },
  { label: "Mission Control", href: "/ops/mission-control" },
  { label: "Patients", href: "/ops/patients" },
  { label: "Practice launch", href: "/ops/launch" },
  { label: "Analytics", href: "/ops/analytics" },
];

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

  return (
    <AppShell user={user} activeRole="operator" nav={OPS_NAV} roleLabel="Practice ops">
      {children}
    </AppShell>
  );
}
