import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Care plan" };

export default async function CarePlanPage() {
  const user = await requireRole("patient");
  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: {
      encounters: {
        orderBy: { scheduledFor: "desc" },
        include: { notes: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  });

  const encounters = patient?.encounters ?? [];

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Care plan"
        title="Your plan and visits"
        description="A simple view of what your care team has recommended and when to come back."
      />

      {encounters.length === 0 ? (
        <EmptyState
          title="No visits yet"
          description="Once your intake is complete, your care team will help you find a time."
        />
      ) : (
        <div className="space-y-4">
          {encounters.map((e) => (
            <Card key={e.id}>
              <CardHeader>
                <CardTitle>{formatDate(e.scheduledFor)}</CardTitle>
                <CardDescription>
                  {e.modality === "video" ? "Video visit" : "In-person visit"} · {e.status}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {e.reason && <p className="text-sm text-text-muted">{e.reason}</p>}
                {e.notes[0]?.status === "finalized" && (
                  <p className="text-xs text-text-subtle mt-3">
                    Visit summary available — open in messages for more detail.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
