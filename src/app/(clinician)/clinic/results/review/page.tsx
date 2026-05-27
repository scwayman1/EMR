import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/ornament";
import {
  buildSignoffQueue,
  type SignoffQueueItem,
} from "@/lib/clinical/result-signoff";
import { ResultSignoffRow } from "./ResultSignoffRow";

export const metadata = { title: "Result review · Sign-off" };

// EMR-165 — Result review queue. Unsigned labs sorted abnormal-first /
// oldest-first. Each row carries an inline sign panel: outcome dropdown,
// optional comment, and a one-click sign action that writes the audit row,
// flips the LabResult, and queues a patient portal message.

export default async function ResultsReviewPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const labs = await prisma.labResult.findMany({
    where: { organizationId: orgId, signedAt: null },
    orderBy: { receivedAt: "desc" },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      outreach: { select: { physicianNote: true } },
    },
    take: 100,
  });

  const items: SignoffQueueItem[] = labs.map((l) => ({
    id: l.id,
    kind: "lab",
    patientId: l.patient.id,
    patientName: `${l.patient.firstName} ${l.patient.lastName}`,
    panelName: l.panelName,
    receivedAt: l.receivedAt,
    abnormalFlag: l.abnormalFlag,
    signedAt: l.signedAt,
    aiSummary: l.outreach?.physicianNote ?? null,
  }));

  const queue = buildSignoffQueue(items);
  const statCount = queue.filter((q) => q.urgency === "stat").length;
  const highCount = queue.filter((q) => q.urgency === "high").length;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Provider · Results"
        title="Result review queue"
        description="One-click sign-off for unsigned lab and screening results. Abnormal results are escalated automatically and require a clinician comment before sign."
        actions={
          queue.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-subtle">
                {queue.length} pending
              </span>
              {statCount > 0 && <Badge tone="danger">{statCount} stat</Badge>}
              {highCount > 0 && <Badge tone="warning">{highCount} high</Badge>}
            </div>
          ) : null
        }
      />

      {queue.length === 0 ? (
        <EmptyState
          title="Queue clear"
          description="No unsigned results — every patient lab has been reviewed and signed."
        />
      ) : (
        <>
          {statCount > 0 && (
            <Eyebrow className="mb-3 text-danger">
              Stat — abnormal & {">"}48h waiting
            </Eyebrow>
          )}
          <div className="space-y-3">
            {queue.map((item) => (
              <ResultSignoffRow key={item.id} item={item} />
            ))}
          </div>
          <Card tone="outlined" className="mt-8">
            <CardContent className="pt-4 pb-4 text-xs text-text-subtle leading-relaxed">
              <p>
                <strong>Audit trail.</strong> Every sign-off writes an
                <code className="font-mono mx-1">AuditLog</code> row with the
                outcome, abnormal flag, comment length, and whether the patient
                was notified. The patient receives a portal message
                automatically when <em>Notify patient</em> is checked.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  );
}
