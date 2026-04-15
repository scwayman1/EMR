import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { ROLE_HOME } from "@/lib/rbac/roles";
import { QuoteWelcomeModal } from "@/components/ui/quote-of-the-day";

const PATIENT_NAV: NavItem[] = [
  { label: "Home", href: "/portal" },
  { label: "Log Dose", href: "/portal/log-dose" },
  { label: "My Health", href: "/portal/records" },
  { label: "My Journey", href: "/portal/lifestyle" },
  { label: "Schedule", href: "/portal/schedule" },
  { label: "Messages", href: "/portal/messages" },
  { label: "Q&A", href: "/portal/qa" },
  { label: "Account", href: "/portal/profile" },
];

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roles.includes("patient")) {
    // User is signed in but not a patient — send them to their home.
    const primary = user.roles[0];
    redirect(ROLE_HOME[primary] ?? "/");
  }

  return (
    <AppShell user={user} activeRole="patient" nav={PATIENT_NAV} roleLabel="Patient portal">
      <QuoteWelcomeModal userName={user.firstName} />
      {children}
    </AppShell>
  );
}
