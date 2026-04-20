import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell, type NavSection } from "@/components/shell/AppShell";
import {
  IconHome,
  IconPill,
  IconCalendar,
  IconMessage,
  IconUser,
} from "@/components/shell/nav-icons";
import { ROLE_HOME } from "@/lib/rbac/roles";
import { QuoteWelcomeModal } from "@/components/ui/quote-of-the-day";
import { CommandPalette } from "@/components/ui/command-palette";

// Patient nav is 5 pillar icons. Each pillar groups 1–3 related routes
// that open in the contextual drawer. Account is overflow — it lives in
// its own pillar rather than cluttering the top level.
const PATIENT_SECTIONS: NavSection[] = [
  {
    label: "Home",
    pillar: "home",
    icon: IconHome,
    items: [{ label: "Home", href: "/portal" }],
  },
  {
    label: "Health",
    pillar: "health",
    icon: IconPill,
    items: [
      { label: "Log Dose", href: "/portal/log-dose" },
      { label: "My Health", href: "/portal/records" },
      { label: "My Journey", href: "/portal/lifestyle" },
    ],
  },
  {
    label: "Schedule",
    pillar: "schedule",
    icon: IconCalendar,
    items: [{ label: "Schedule", href: "/portal/schedule" }],
  },
  {
    label: "Messages",
    pillar: "messages",
    icon: IconMessage,
    items: [
      { label: "Messages", href: "/portal/messages" },
      { label: "Q&A", href: "/portal/qa" },
    ],
  },
  {
    label: "Account",
    pillar: "account",
    icon: IconUser,
    items: [{ label: "Account", href: "/portal/profile" }],
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
