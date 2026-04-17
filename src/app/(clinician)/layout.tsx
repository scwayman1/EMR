import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { ROLE_HOME } from "@/lib/rbac/roles";
import { QuoteWelcomeModal } from "@/components/ui/quote-of-the-day";
import { BreathingBreak } from "@/components/ui/breathing-break";
import { KeyboardShortcuts } from "@/components/ui/keyboard-shortcuts";
import { CommandPalette } from "@/components/ui/command-palette";
import { prisma } from "@/lib/db/prisma";

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

  // Live counts so the nav can telegraph agent activity the moment you log in.
  // Pending AI drafts = Nurse Nora (et al.) needs your sign-off.
  // Emergency count promotes the pill to red + pulse.
  const [pendingCount, emergencyCount, labsPendingCount, refillsPendingCount] = user.organizationId
    ? await Promise.all([
        prisma.message.count({
          where: {
            status: "draft",
            aiDrafted: true,
            thread: { patient: { organizationId: user.organizationId } },
          },
        }),
        prisma.message.count({
          where: {
            status: "draft",
            aiDrafted: true,
            thread: {
              triageUrgency: "emergency",
              patient: { organizationId: user.organizationId },
            },
          },
        }),
        prisma.labResult.count({
          where: {
            organizationId: user.organizationId,
            signedAt: null,
          },
        }),
        prisma.refillRequest.count({
          where: {
            organizationId: user.organizationId,
            status: { in: ["new", "flagged"] },
            signedAt: null,
          },
        }),
      ])
    : [0, 0, 0, 0];

  const nav: NavItem[] = [
    { label: "Command", href: "/clinic" },
    { label: "Brief", href: "/clinic/morning-brief" },
    { label: "Roster", href: "/clinic/patients" },
    { label: "Inbox", href: "/clinic/messages" },
    {
      label: "Approvals",
      href: "/clinic/approvals",
      count: pendingCount,
      countTone: emergencyCount > 0 ? "danger" : "highlight",
    },
    {
      label: "Labs",
      href: "/clinic/labs-review",
      count: labsPendingCount,
      countTone: "highlight",
    },
    {
      label: "Refills",
      href: "/clinic/refills",
      count: refillsPendingCount,
      countTone: "highlight",
    },
    { label: "Providers", href: "/clinic/providers" },
    { label: "Research", href: "/clinic/research" },
    { label: "Library", href: "/clinic/library" },
    { label: "Audit", href: "/clinic/audit-trail" },
  ];

  return (
    <AppShell
      user={user}
      activeRole="clinician"
      nav={nav}
      roleLabel="Provider"
    >
      <QuoteWelcomeModal userName={user.firstName} />
      <BreathingBreak />
      <KeyboardShortcuts />
      <CommandPalette />
      {children}
    </AppShell>
  );
}
