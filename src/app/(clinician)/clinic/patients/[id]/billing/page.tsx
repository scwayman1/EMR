import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Eyebrow, LeafSprig, EditorialRule } from "@/components/ui/ornament";
import { formatDate } from "@/lib/utils/format";

interface PageProps {
  params: { id: string };
}

export const metadata = { title: "Billing Worksheet" };

export default async function BillingPage({ params }: PageProps) {
  const user = await requireUser();

  const [patient, encounters] = await Promise.all([
    prisma.patient.findFirst({
      where: {
        id: params.id,
        organizationId: user.organizationId!,
        deletedAt: null,
      },
    }),
    prisma.encounter.findMany({
      where: {
        patientId: params.id,
        organizationId: user.organizationId!,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        notes: {
          include: { codingSuggestion: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  if (!patient) notFound();

  // Collect all coding suggestions
  const codingSuggestions = encounters.flatMap((enc) =>
    enc.notes
      .filter((n) => n.codingSuggestion)
      .map((n) => ({
        noteId: n.id,
        encounterId: enc.id,
        encounterDate: enc.scheduledFor ?? enc.createdAt,
        modality: enc.modality,
        status: n.status,
        coding: n.codingSuggestion!,
      })),
  );

  return (
    <PageShell maxWidth="max-w-[1080px]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Avatar
            firstName={patient.firstName}
            lastName={patient.lastName}
            size="lg"
          />
          <div>
            <Eyebrow className="mb-2">Billing & Coding</Eyebrow>
            <h1 className="font-display text-2xl text-text tracking-tight">
              Superbill — {patient.firstName} {patient.lastName}
            </h1>
          </div>
        </div>
        <Link href={`/clinic/patients/${params.id}?tab=notes`}>
          <Button variant="secondary" size="sm">
            Back to chart
          </Button>
        </Link>
      </div>

      {codingSuggestions.length === 0 ? (
        <Card tone="raised" className="text-center py-12">
          <CardContent>
            <LeafSprig size={32} className="text-accent/40 mx-auto mb-4" />
            <h2 className="font-display text-xl text-text tracking-tight">
              No coding suggestions yet
            </h2>
            <p className="text-sm text-text-muted mt-2 max-w-md mx-auto">
              Start a visit and let the AI scribe generate a note. The Coding
              Readiness Agent will then produce ICD-10 and E&M suggestions.
            </p>
            <Link href={`/clinic/patients/${params.id}?tab=notes`}>
              <Button className="mt-6">Go to notes</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary card */}
          <Card tone="ambient">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LeafSprig size={16} className="text-accent" />
                Billing Summary
              </CardTitle>
              <CardDescription>
                AI-generated coding suggestions. Review and approve before
                submission.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-display text-3xl text-text">
                    {codingSuggestions.length}
                  </p>
                  <p className="text-xs text-text-muted mt-1">Encounters coded</p>
                </div>
                <div>
                  <p className="font-display text-3xl text-text">
                    {codingSuggestions.reduce(
                      (acc, cs) => acc + ((cs.coding as any).icd10Codes?.length ?? 0),
                      0,
                    )}
                  </p>
                  <p className="text-xs text-text-muted mt-1">ICD-10 codes</p>
                </div>
                <div>
                  <p className="font-display text-3xl text-accent">
                    {codingSuggestions.filter((cs) => (cs.coding as any).emLevel).length}
                  </p>
                  <p className="text-xs text-text-muted mt-1">E&M levels assigned</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <EditorialRule />

          {/* Per-encounter worksheets */}
          {codingSuggestions.map((cs) => {
            const coding = cs.coding as any;
            const icd10 = coding.icd10Codes ?? [];
            const emLevel = coding.emLevel ?? null;
            const rationale = coding.rationale ?? "";

            return (
              <Card key={cs.noteId} tone="raised">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base">
                      {formatDate(cs.encounterDate)} — {cs.modality === "video" ? "Video" : cs.modality === "phone" ? "Phone" : "In-Person"}
                    </CardTitle>
                    <div className="flex gap-2">
                      {emLevel && (
                        <Badge tone="accent">{emLevel}</Badge>
                      )}
                      <Badge tone={cs.status === "finalized" ? "success" : "warning"}>
                        {cs.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* ICD-10 codes */}
                  {icd10.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-text-subtle mb-2">
                        ICD-10 Codes
                      </p>
                      <div className="space-y-2">
                        {icd10.map((code: any) => (
                          <div
                            key={code.code}
                            className="flex items-center gap-3 p-3 rounded-lg bg-surface-muted/50"
                          >
                            <span className="font-mono text-xs text-accent font-medium whitespace-nowrap">
                              {code.code}
                            </span>
                            <span className="text-sm text-text flex-1">
                              {code.label}
                            </span>
                            {code.confidence != null && (
                              <Badge
                                tone={
                                  code.confidence >= 0.8
                                    ? "success"
                                    : code.confidence >= 0.5
                                      ? "accent"
                                      : "warning"
                                }
                                className="text-[10px]"
                              >
                                {Math.round(code.confidence * 100)}%
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cannabis-specific codes */}
                  <div className="mb-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-text-subtle mb-2">
                      Cannabis-Specific Coding
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-accent/10">
                        <span className="font-mono text-xs text-accent font-medium">
                          Z71.89
                        </span>
                        <span className="text-sm text-text-muted">
                          Cannabis counseling
                        </span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-accent/10">
                        <span className="font-mono text-xs text-accent font-medium">
                          F12.90
                        </span>
                        <span className="text-sm text-text-muted">
                          Cannabis use, unspecified
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rationale */}
                  {rationale && (
                    <div className="mt-4 pt-4 border-t border-border/60">
                      <p className="text-xs font-medium uppercase tracking-wider text-text-subtle mb-1">
                        AI Rationale
                      </p>
                      <p className="text-sm text-text-muted leading-relaxed">
                        {rationale}
                      </p>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <p className="text-[10px] text-text-subtle italic">
                    AI-generated — physician review required before billing submission.
                  </p>
                  <div className="ml-auto flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => window.print()}>
                      Print
                    </Button>
                    <Link href={`/clinic/patients/${params.id}/notes/${cs.noteId}`}>
                      <Button variant="secondary" size="sm">
                        View note
                      </Button>
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
