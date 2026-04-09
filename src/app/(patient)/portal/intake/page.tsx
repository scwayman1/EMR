import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IntakeForm } from "./intake-form";

export const metadata = { title: "Intake" };

export default async function IntakePage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: { chartSummary: true },
  });
  if (!patient) redirect("/portal");

  return (
    <PageShell maxWidth="max-w-[880px]">
      <PageHeader
        eyebrow="Intake"
        title="A few things about your care"
        description="This helps your care team arrive prepared and focus the visit on what matters to you."
        actions={
          patient.chartSummary && (
            <Badge tone={patient.chartSummary.completenessScore >= 80 ? "success" : "warning"}>
              {patient.chartSummary.completenessScore}% complete
            </Badge>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>About you</CardTitle>
          <CardDescription>
            All fields are optional. The more you share, the better we can help.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IntakeForm
            initial={{
              presentingConcerns: patient.presentingConcerns ?? "",
              treatmentGoals: patient.treatmentGoals ?? "",
              priorUse:
                ((patient.cannabisHistory as any)?.priorUse as boolean | undefined) ?? false,
              formats:
                ((patient.cannabisHistory as any)?.formats as string[] | undefined)?.join(", ") ??
                "",
              reportedBenefits:
                ((patient.cannabisHistory as any)?.reportedBenefits as string[] | undefined)?.join(
                  ", "
                ) ?? "",
            }}
          />
        </CardContent>
      </Card>

      {patient.chartSummary && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>What your care team will see</CardTitle>
            <CardDescription>
              Generated from your intake. Reviewed by your clinician before every visit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose-clinical whitespace-pre-wrap">
              {patient.chartSummary.summaryMd}
            </div>
            {patient.chartSummary.missingFields.length > 0 && (
              <div className="mt-6 p-4 rounded-md bg-accent-soft border border-accent/20">
                <p className="text-xs font-medium uppercase tracking-wide text-accent mb-2">
                  Still needed
                </p>
                <ul className="text-sm text-text-muted list-disc pl-5 space-y-1">
                  {patient.chartSummary.missingFields.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
