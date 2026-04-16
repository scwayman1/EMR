import Link from "next/link";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOutcomeForm } from "./log-form";

export const metadata = { title: "Log a check-in" };

export default function NewOutcomePage() {
  return (
    <PageShell maxWidth="max-w-[640px]">
      <div className="mb-4">
        <Link
          href="/portal/outcomes"
          className="text-xs text-text-muted hover:text-text"
        >
          &larr; Back to outcomes
        </Link>
      </div>

      <PageHeader
        eyebrow="Outcomes"
        title="Quick check-in"
        description="A 30-second log helps your care team see how you're trending between visits."
      />

      <Card>
        <CardHeader>
          <CardTitle>How are you right now?</CardTitle>
          <CardDescription>
            Pick what you&apos;re tracking, slide the score, add a quick note.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogOutcomeForm />
        </CardContent>
      </Card>
    </PageShell>
  );
}
