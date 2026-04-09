import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Patients" };

export default async function PatientsPage() {
  const user = await requireUser();
  const patients = await prisma.patient.findMany({
    where: { organizationId: user.organizationId!, deletedAt: null },
    include: { chartSummary: true },
    orderBy: { lastName: "asc" },
  });

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Patients"
        title="All patients"
        description={`${patients.length} patient${patients.length === 1 ? "" : "s"} on record.`}
      />
      <Card>
        <CardContent className="pt-4">
          <ul className="divide-y divide-border -mx-6">
            {patients.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/clinic/patients/${p.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-surface-muted transition-colors"
                >
                  <Avatar firstName={p.firstName} lastName={p.lastName} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text">
                        {p.firstName} {p.lastName}
                      </p>
                      <Badge tone="neutral">{p.status}</Badge>
                      {p.chartSummary && (
                        <Badge tone="accent">Chart {p.chartSummary.completenessScore}%</Badge>
                      )}
                    </div>
                    <p className="text-xs text-text-subtle mt-1">
                      {p.presentingConcerns ?? "—"}
                    </p>
                  </div>
                  <p className="text-xs text-text-subtle hidden md:block">
                    Updated {formatDate(p.updatedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PageShell>
  );
}
