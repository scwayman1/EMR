import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { verifyShareToken } from "@/lib/auth/share-tokens";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wordmark } from "@/components/ui/logo";
import { formatDate } from "@/lib/utils/format";

/**
 * Read-Only Patient Share Link — EMR-149
 *
 * Secured with HMAC-signed, time-limited tokens. The URL contains a
 * signed payload (not the raw patient ID). Tokens expire after 72 hours.
 * Generate tokens via generateShareToken() from share-tokens.ts.
 */

export const metadata = { title: "Patient Summary — Leafjourney" };

export default async function SharePage({
  params,
}: {
  params: { token: string };
}) {
  // Verify the signed token — returns null if invalid or expired
  const patientId = verifyShareToken(params.token);
  if (!patientId) notFound();

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      medications: { where: { active: true }, orderBy: { name: "asc" } },
      dosingRegimens: {
        where: { active: true },
        include: { product: true },
      },
    },
  });

  if (!patient) notFound();

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Wordmark size="sm" />
          <Badge tone="info" className="text-[10px]">
            Read-only summary
          </Badge>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6 pb-6">
            <h1 className="font-display text-2xl text-text tracking-tight">
              {patient.firstName} {patient.lastName}
            </h1>
            {patient.dateOfBirth && (
              <p className="text-sm text-text-muted mt-1">
                Date of birth: {formatDate(patient.dateOfBirth)}
              </p>
            )}
            {patient.phone && (
              <p className="text-sm text-text-muted">
                Phone: {patient.phone}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Allergies — always prominent */}
        {patient.allergies && patient.allergies.length > 0 && (
          <Card className="mb-4 border-l-4 border-l-danger">
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-danger mb-2">
                Allergies
              </p>
              <div className="flex flex-wrap gap-1.5">
                {patient.allergies.map((a) => (
                  <Badge key={a} tone="danger" className="text-[11px]">
                    {a}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contraindications */}
        {patient.contraindications && patient.contraindications.length > 0 && (
          <Card className="mb-4 border-l-4 border-l-[color:var(--warning)]">
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--highlight-hover)] mb-2">
                Contraindications
              </p>
              <div className="flex flex-wrap gap-1.5">
                {patient.contraindications.map((c) => (
                  <Badge key={c} tone="warning" className="text-[11px]">
                    {c}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Medications */}
        {patient.medications.length > 0 && (
          <Card className="mb-4">
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-subtle mb-2">
                Current medications
              </p>
              <ul className="space-y-1">
                {patient.medications.map((m: any) => (
                  <li key={m.id} className="text-sm text-text">
                    {m.name}
                    {m.dosage && (
                      <span className="text-text-muted"> — {m.dosage}</span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Cannabis regimen */}
        {patient.dosingRegimens.length > 0 && (
          <Card className="mb-4">
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-subtle mb-2">
                Cannabis regimen
              </p>
              <ul className="space-y-1">
                {patient.dosingRegimens.map((r: any) => (
                  <li key={r.id} className="text-sm text-text">
                    {r.product?.name ?? "Cannabis product"}:{" "}
                    <span className="text-text-muted">
                      {r.volumePerDose}
                      {r.volumeUnit}, {r.frequencyPerDay}x/day
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Presenting concerns */}
        {patient.presentingConcerns && (
          <Card className="mb-4">
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-subtle mb-2">
                Presenting concerns
              </p>
              <p className="text-sm text-text leading-relaxed">
                {patient.presentingConcerns}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-text-subtle">
            This is a read-only patient summary from Leafjourney Health.
          </p>
          <p className="text-xs text-text-subtle mt-1">
            For questions, contact the patient&apos;s care team at leafjourney.com.
          </p>
        </div>
      </div>
    </div>
  );
}
