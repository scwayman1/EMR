import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NewThreadForm } from "@/components/messaging/NewThreadForm";
import { createClinicianThreadAction } from "../actions";

export const metadata = { title: "New message" };

export default async function ClinicianNewThreadPage({
  searchParams,
}: {
  searchParams: { patientId?: string; subject?: string };
}) {
  const user = await requireUser();
  if (!user.organizationId) notFound();

  // A patientId is required — this page is always reached from a chart.
  if (!searchParams.patientId) redirect("/clinic/patients");

  const patient = await prisma.patient.findFirst({
    where: {
      id: searchParams.patientId,
      organizationId: user.organizationId,
    },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!patient) notFound();

  return (
    <PageShell maxWidth="max-w-[640px]">
      <div className="mb-4">
        <Link
          href={`/clinic/patients/${patient.id}`}
          className="text-xs text-text-muted hover:text-text"
        >
          &larr; Back to chart
        </Link>
      </div>

      <PageHeader
        eyebrow="Messages"
        title="New message"
        description={`Starting a new thread with ${patient.firstName} ${patient.lastName}.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Compose</CardTitle>
          <CardDescription>
            The patient will see this in their secure inbox and can reply from
            their portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewThreadForm
            action={createClinicianThreadAction}
            defaultSubject={searchParams.subject}
            defaultRecipient={patient.id}
            recipientLabel={`${patient.firstName} ${patient.lastName}`}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
