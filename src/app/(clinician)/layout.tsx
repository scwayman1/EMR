import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { ROLE_HOME } from "@/lib/rbac/roles";

const CLINICIAN_NAV: NavItem[] = [
  { label: "Command", href: "/clinic" },
  { label: "Roster", href: "/clinic/patients" },
  { label: "Inbox", href: "/clinic/messages" },
  { label: "Research", href: "/clinic/research" },
];

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

  return (
    <AppShell
      user={user}
      activeRole="clinician"
      nav={CLINICIAN_NAV}
      roleLabel="Provider"
    >
      {children}
    </AppShell>
  );
}
