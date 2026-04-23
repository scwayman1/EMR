import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { SmsView } from "./sms-view";

export const metadata = { title: "SMS Messaging" };

export default async function ClinicSmsPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const patients = await prisma.patient.findMany({
    where: { organizationId: orgId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
    take: 50,
    orderBy: { lastName: "asc" },
  });

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <PageHeader
        eyebrow="Communications"
        title="Send SMS"
        description="Quick outbound SMS for reminders, nudges, and updates. Uses approved templates and HIPAA-safe phrasing."
      />
      <SmsView
        patients={patients.map((p) => ({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          phone: p.phone ?? null,
        }))}
      />
    </PageShell>
  );
}
