import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell, type NavSection } from "@/components/shell/AppShell";
import { ROLE_HOME } from "@/lib/rbac/roles";
import { QuoteWelcomeModal } from "@/components/ui/quote-of-the-day";
import { CommandPalette } from "@/components/ui/command-palette";

// Patient nav stays flat — 8 items is short enough that grouping would add
// noise, not reduce it. The ⌘K palette still surfaces here so patients can
// jump anywhere with a keyboard shortcut.
const PATIENT_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Home", href: "/portal" },
      { label: "Log Dose", href: "/portal/log-dose" },
      { label: "My Health", href: "/portal/records" },
      { label: "My Journey", href: "/portal/lifestyle" },
      { label: "Schedule", href: "/portal/schedule" },
      { label: "Messages", href: "/portal/messages" },
      { label: "Q&A", href: "/portal/qa" },
      { label: "Account", href: "/portal/profile" },
    ],
  },
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
    <AppShell
      user={user}
      activeRole="patient"
      sections={PATIENT_SECTIONS}
      roleLabel="Patient portal"
    >
      <QuoteWelcomeModal userName={user.firstName} />
      <CommandPalette role="patient" />
      {children}
    </AppShell>
  );
}
