import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils/format";
import { listMedicationPriorAuths } from "@/lib/domain/medication-prior-auth";
import { AiAppealButton } from "./AiAppealButton";

interface PageProps {
  params: { id: string };
}

export const metadata = { title: "Prior authorizations" };

// ---------------------------------------------------------------------------
// Clinician — Medication Prior Authorizations (EMR-076)
// ---------------------------------------------------------------------------
// Lists every Rx PA for the patient with status badges. Denied PAs surface
// the "AI Appeal" button which dispatches the medicationPaAppeal agent
// into the background AgentJob queue. When the agent finishes, the drafted
// appeal letter renders inline for clinician review and signature.
// ---------------------------------------------------------------------------

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  approved: "success",
  pending: "warning",
  denied: "danger",
  appealed: "warning",
  abandoned: "neutral",
};

export default async function PatientPriorAuthsPage({ params }: PageProps) {
  const user = await requireUser();

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, organizationId: user.organizationId!, deletedAt: null },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!patient) notFound();

  const priorAuths = await listMedicationPriorAuths(patient.id);

  return (
    <PageShell maxWidth="max-w-[920px]">
      <PageHeader
        eyebrow="Prior authorizations"
        title={`${patient.firstName}'s medication PAs`}
        description="Track payer prior-authorization status for every prescribed medication. Denied PAs can be appealed with a single click — the AI drafts a letter for your review."
      />

      {priorAuths.length === 0 ? (
        <EmptyState
          title="No prior authorizations on file"
          description="When a payer requires PA for a prescription, it'll show up here. Denied PAs get an AI Appeal button that drafts a letter you can sign."
        />
      ) : (
        <div className="space-y-4">
          {priorAuths.map((pa) => (
            <Card key={pa.id} tone="raised">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">
                    {pa.medication.name}
                    {pa.medication.dosage ? (
                      <span className="text-sm text-text-muted font-normal ml-2">
                        {pa.medication.dosage}
                      </span>
                    ) : null}
                  </CardTitle>
                  <CardDescription>
                    {pa.payerName}
                    {pa.payerPolicyId ? ` · policy ${pa.payerPolicyId}` : ""}
                    {pa.submittedAt ? ` · submitted ${formatDate(pa.submittedAt)}` : ""}
                  </CardDescription>
                </div>
                <Badge tone={STATUS_TONE[pa.status] ?? "neutral"}>
                  {pa.status.toUpperCase()}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {pa.diagnosisCodes.length > 0 && (
                  <p className="text-xs text-text-muted">
                    <span className="text-text font-medium">Justifying ICD-10:</span>{" "}
                    {pa.diagnosisCodes.join(", ")}
                  </p>
                )}

                {pa.status === "denied" && (
                  <div className="p-3 rounded-md bg-danger/[0.06] border border-danger/20">
                    <p className="text-[10px] uppercase tracking-wider font-medium text-danger mb-1">
                      Denial reason
                    </p>
                    <p className="text-sm text-text">{pa.denialReason ?? "(not specified)"}</p>
                    {pa.denialCarc && (
                      <p className="text-[11px] text-text-muted mt-1">
                        CARC: {pa.denialCarc}
                      </p>
                    )}
                  </div>
                )}

                {(pa.status === "denied" || pa.status === "appealed") && (
                  <AiAppealButton
                    patientId={patient.id}
                    priorAuthId={pa.id}
                    appealStatus={pa.appealStatus}
                    hasDraft={!!pa.appealLetterMd}
                  />
                )}

                {pa.appealLetterMd && (
                  <details className="border border-border rounded-md p-3">
                    <summary className="text-sm font-medium cursor-pointer">
                      Drafted appeal letter
                      {pa.appealDraftedAt && (
                        <span className="text-xs text-text-muted ml-2">
                          · {formatDate(pa.appealDraftedAt)}
                        </span>
                      )}
                    </summary>
                    <pre className="mt-3 text-xs whitespace-pre-wrap font-sans text-text leading-relaxed">
                      {pa.appealLetterMd}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
