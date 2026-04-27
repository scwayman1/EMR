import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ScanIntakeClient } from "./scan-intake-client";

export const metadata = { title: "Scan Intake" };

export default async function ScanIntakePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();

  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      organizationId: user.organizationId!,
      deletedAt: null,
    },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!patient) notFound();

  return (
    <PageShell maxWidth="max-w-[900px]">
      <PageHeader
        eyebrow="Intake"
        title="Scan paper med list"
        description={`Drop a photo or PDF of ${patient.firstName}'s outside medication list. We'll extract the medications and let you review before saving.`}
      />
      <Card tone="raised">
        <CardContent className="pt-6 pb-6">
          <ScanIntakeClient patientId={patient.id} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
