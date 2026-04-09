import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Patients" };

export default async function OpsPatientsPage() {
  const user = await requireUser();
  const patients = await prisma.patient.findMany({
    where: { organizationId: user.organizationId!, deletedAt: null },
    include: { chartSummary: true, tasks: { where: { status: "open" } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Patients"
        title="Intake funnel"
        description="Every patient in the system, sorted by most recent activity."
      />
      <Card>
        <CardContent className="pt-4">
          <ul className="divide-y divide-border -mx-6">
            {patients.map((p) => (
              <li key={p.id} className="px-6 py-4">
                <div className="flex items-center gap-4">
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
                      {p.tasks.length > 0 && (
                        <Badge tone="warning">
                          {p.tasks.length} open task{p.tasks.length === 1 ? "" : "s"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-text-subtle mt-1">
                      Updated {formatRelative(p.updatedAt)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PageShell>
  );
}
