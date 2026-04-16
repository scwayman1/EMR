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
import { FontSizeToggle } from "@/components/ui/font-size-toggle";
import { MotionToggle } from "@/components/ui/motion-toggle";

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

      <div className="space-y-5">
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

        <Card tone="raised">
          <CardHeader>
            <CardTitle>Text size</CardTitle>
            <CardDescription>
              Make the portal easier to read. Your choice follows you across devices signed into this browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-text">Font size</p>
                <p className="text-xs text-text-subtle mt-0.5">
                  Small, medium (default), or large.
                </p>
              </div>
              <FontSizeToggle />
            </div>
          </CardContent>
        </Card>

        <Card tone="raised">
          <CardHeader>
            <CardTitle>Motion</CardTitle>
            <CardDescription>
              Turn off portal animations and transitions. We start from your device preference by default.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text">Reduce motion</p>
                <p className="text-xs text-text-subtle mt-0.5">
                  Respects system preference; override here if you like.
                </p>
              </div>
              <MotionToggle />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
