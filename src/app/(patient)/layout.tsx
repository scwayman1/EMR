import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { ROLE_HOME } from "@/lib/rbac/roles";

const PATIENT_NAV: NavItem[] = [
  { label: "Home", href: "/portal" },
  { label: "Profile", href: "/portal/profile" },
  { label: "Intake", href: "/portal/intake" },
  { label: "Records", href: "/portal/records" },
  { label: "Assessments", href: "/portal/assessments" },
  { label: "Outcomes", href: "/portal/outcomes" },
  { label: "Lifestyle", href: "/portal/lifestyle" },
  { label: "Care plan", href: "/portal/care-plan" },
  { label: "Medications", href: "/portal/medications" },
  { label: "My Garden", href: "/portal/garden" },
  { label: "Achievements", href: "/portal/achievements" },
  { label: "My Story", href: "/portal/my-story" },
  { label: "Messages", href: "/portal/messages" },
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
      {children}
    </AppShell>
  );
}
