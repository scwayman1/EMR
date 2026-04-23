import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/ornament";
import { LetterView } from "./letter-view";

interface PageProps {
  params: { id: string };
}

export const metadata = { title: "Referral letter" };

export default async function ReferralLetterPage({ params }: PageProps) {
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
  const practiceName = user.organizationName ?? "Leafjourney";

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
            <Eyebrow className="mb-2">Referral letter</Eyebrow>
            <h1 className="font-display text-2xl text-text tracking-tight">
              Letter for {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Choose a template and fine-tune the letter before printing.
            </p>
          </div>
        </div>
        <Link href={`/clinic/patients/${params.id}`}>
          <Button variant="secondary" size="sm">
            Back to chart
          </Button>
        </Link>
      </div>

      <LetterView
        patientFirstName={patient.firstName}
        patientLastName={patient.lastName}
        patientDob={patient.dateOfBirth ? patient.dateOfBirth.toISOString().slice(0, 10) : ""}
        providerName={providerName}
        practiceName={practiceName}
      />
    </PageShell>
  );
}
