import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireRole("patient");

  return (
    <PageShell maxWidth="max-w-[880px]">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your appearance and platform preferences."
      />
      <PatientSectionNav section="account" />

      <Card tone="raised">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose between light and dark mode. Your preference is saved locally.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text">Theme</p>
              <p className="text-xs text-text-subtle mt-0.5">
                Toggle between light and dark mode
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
