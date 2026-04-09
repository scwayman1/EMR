import { prisma } from "@/lib/db/prisma";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Assessments" };

export default async function AssessmentsPage() {
  const assessments = await prisma.assessment.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Assessments"
        title="Quick check-ins"
        description="Short questionnaires that help your care team track how you're doing between visits."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assessments.map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <CardTitle>{a.title}</CardTitle>
              <CardDescription>{a.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="secondary">
                Start
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
