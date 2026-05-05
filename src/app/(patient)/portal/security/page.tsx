import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { UserProfile } from "@clerk/nextjs";

export const metadata = { title: "Security Settings" };

export default async function SecurityPage() {
  await requireRole("patient");

  return (
    <PageShell maxWidth="max-w-[880px]">
      <PageHeader
        eyebrow="Account"
        title="Security & Sign-in"
        description="Manage your password, email addresses, and connected accounts."
      />
      <PatientSectionNav section="account" />

      <div className="flex justify-center mt-8">
        <UserProfile 
          appearance={{
            elements: {
              rootBox: "w-full shadow-none",
              cardBox: "w-full shadow-sm border border-[var(--border)] rounded-2xl",
              navbar: "hidden", // Hide Clerk's internal sidebar since we have our own nav
              pageScrollBox: "p-6 sm:p-8",
              headerTitle: "font-display text-2xl text-text",
              headerSubtitle: "text-text-muted",
              profileSectionTitleText: "font-medium text-text",
              badge: "bg-[var(--surface-muted)] text-text-muted border-[var(--border)]",
              formButtonPrimary: "bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--leaf)] transition-colors",
            }
          }}
        />
      </div>
    </PageShell>
  );
}
