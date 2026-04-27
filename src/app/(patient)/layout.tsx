import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell, type NavSection } from "@/components/shell/AppShell";
import { ROLE_HOME } from "@/lib/rbac/roles";
import { MotivationalQuoteToast } from "@/components/ui/motivational-quote-toast";
import { MusicWidget } from "@/components/ui/music-widget";
import { CommandPalette } from "@/components/ui/command-palette";

const PATIENT_SECTIONS: NavSection[] = [
  {
    label: "Home",
    pillar: "home",
    items: [{ label: "Home", href: "/portal" }],
  },
  {
    label: "Health",
    pillar: "health",
    items: [
      { label: "Log Dose", href: "/portal/log-dose" },
      { label: "My Health", href: "/portal/records" },
      { label: "My Journey", href: "/portal/lifestyle" },
    ],
  },
  {
    label: "Schedule",
    pillar: "schedule",
    items: [{ label: "Schedule", href: "/portal/schedule" }],
  },
  {
    label: "Messages",
    pillar: "messages",
    items: [
      { label: "Messages", href: "/portal/messages" },
      { label: "Q&A", href: "/portal/qa" },
    ],
  },
  {
    label: "Account",
    pillar: "account",
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
      <MotivationalQuoteToast userName={user.firstName} />
      <CommandPalette role="patient" />
      {children}
      <MusicWidget />
    </AppShell>
  );
}
