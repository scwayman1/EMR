import Link from "next/link";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NewThreadForm } from "@/components/messaging/NewThreadForm";
import { createPatientThreadAction } from "../actions";

export const metadata = { title: "New message" };

export default function PatientNewThreadPage() {
  return (
    <PageShell maxWidth="max-w-[640px]">
      <div className="mb-4">
        <Link
          href="/portal/messages"
          className="text-xs text-text-muted hover:text-text"
        >
          &larr; All messages
        </Link>
      </div>

      <PageHeader
        eyebrow="Messages"
        title="New message"
        description="Reach your care team. They'll see this in the inbox and reply here."
      />

      <Card>
        <CardHeader>
          <CardTitle>Start a new thread</CardTitle>
          <CardDescription>
            Give your message a short subject so your care team can triage quickly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewThreadForm
            action={createPatientThreadAction}
            recipientLabel="Your care team"
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
