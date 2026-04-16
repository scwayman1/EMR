import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ComingSoonButton } from "@/components/ui/coming-soon-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Records" };

export default async function RecordsPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: {
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const documents = patient?.documents ?? [];

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Records"
        title="Your documents"
        description="Upload notes, labs, and letters. We organize them so your care team is ready for your visit."
        actions={<ComingSoonButton>Upload a file</ComingSoonButton>}
      />

      <Card>
        <CardHeader>
          <CardTitle>All documents</CardTitle>
          <CardDescription>
            {documents.length === 0
              ? "You haven't uploaded anything yet."
              : `${documents.length} document${documents.length === 1 ? "" : "s"} on file.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <EmptyState
              title="No documents yet"
              description="Drag a PDF or image here, or click upload. Everything is encrypted and only visible to your care team."
              action={<ComingSoonButton>Upload a file</ComingSoonButton>}
            />
          ) : (
            <ul className="divide-y divide-border -mx-6">
              {documents.map((doc) => (
                <li key={doc.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text truncate">{doc.originalName}</p>
                      <Badge tone="neutral">{doc.kind}</Badge>
                      {doc.needsReview && <Badge tone="warning">Needs review</Badge>}
                    </div>
                    <p className="text-xs text-text-subtle mt-1">
                      {formatDate(doc.createdAt)} · {(doc.sizeBytes / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <ComingSoonButton size="sm">View</ComingSoonButton>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
