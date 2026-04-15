import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format";
import { NoteEditor } from "./note-editor";

interface PageProps {
  params: { id: string; noteId: string };
}

export default async function NoteDetailPage({ params }: PageProps) {
  const user = await requireUser();

  const note = await prisma.note.findUnique({
    where: { id: params.noteId },
    include: {
      encounter: {
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, organizationId: true } },
        },
      },
      codingSuggestion: true,
    },
  });

  if (!note) notFound();
  if (note.encounter.patient.organizationId !== user.organizationId) notFound();
  if (note.encounter.patientId !== params.id) notFound();

  const patient = note.encounter.patient;

  // Parse blocks — they are stored as JSON
  const blocks: { heading: string; body: string }[] = Array.isArray(note.blocks)
    ? (note.blocks as { heading: string; body: string }[])
    : [];

  // Parse coding suggestion
  const codingSuggestion = note.codingSuggestion
    ? {
        icd10: note.codingSuggestion.icd10 as { code: string; label: string; confidence: number }[],
        emLevel: note.codingSuggestion.emLevel,
        rationale: note.codingSuggestion.rationale,
      }
    : null;

  return (
    <PageShell maxWidth="max-w-[900px]">
      <PageHeader
        eyebrow="Clinical note"
        title={`Note — ${formatDate(note.createdAt)}`}
        description={`${patient.firstName} ${patient.lastName} · ${note.encounter.modality} visit`}
        actions={
          <Link href={`/clinic/patients/${params.id}?tab=notes`}>
            <Button variant="secondary">Back to chart</Button>
          </Link>
        }
      />

      <NoteEditor
        noteId={note.id}
        patientId={params.id}
        encounterId={note.encounterId}
        initialBlocks={blocks}
        status={note.status}
        aiDrafted={note.aiDrafted}
        aiConfidence={note.aiConfidence}
        codingSuggestion={codingSuggestion}
      />
    </PageShell>
  );
}
