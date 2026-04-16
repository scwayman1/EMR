import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/ornament";
import { ProblemListView } from "./problem-list-view";

interface PageProps {
  params: { id: string };
}

export const metadata = { title: "Problem List" };

export default async function ProblemListPage({ params }: PageProps) {
  const user = await requireUser();

  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      organizationId: user.organizationId!,
      deletedAt: null,
    },
  });

  if (!patient) notFound();

  const providerName = `${user.firstName} ${user.lastName}`;

  return (
    <PageShell maxWidth="max-w-[1080px]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Avatar
            firstName={patient.firstName}
            lastName={patient.lastName}
            size="lg"
          />
          <div>
            <Eyebrow className="mb-2">Problem list</Eyebrow>
            <h1 className="font-display text-2xl text-text tracking-tight">
              Problems for {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Structured diagnoses, status, and notes.
            </p>
          </div>
        </div>
        <Link href={`/clinic/patients/${params.id}`}>
          <Button variant="secondary" size="sm">
            Back to chart
          </Button>
        </Link>
      </div>

      <ProblemListView patientId={params.id} providerName={providerName} />
    </PageShell>
  );
}
