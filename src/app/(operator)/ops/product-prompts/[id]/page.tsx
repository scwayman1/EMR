import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatRelative } from "@/lib/utils/format";
import { LinearCardSchema, type LinearCard } from "@/lib/agents/product-manager-agent";
import { z } from "zod";

export const metadata = { title: "Mallik prompt detail" };

const PRIORITY_TONE: Record<
  LinearCard["priority"],
  "neutral" | "accent" | "success" | "warning" | "danger" | "info"
> = {
  urgent: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
  no_priority: "neutral",
};

function parseCards(raw: unknown): LinearCard[] {
  const result = z.array(LinearCardSchema).safeParse(raw);
  return result.success ? result.data : [];
}

function parseOpenQuestions(raw: unknown): string[] {
  const result = z.array(z.string()).safeParse(raw);
  return result.success ? result.data : [];
}

export default async function ProductPromptDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const prompt = await prisma.productPrompt.findFirst({
    where: {
      id: params.id,
      OR: [{ organizationId: user.organizationId }, { organizationId: null }],
    },
  });
  if (!prompt) notFound();

  const cards = parseCards(prompt.cards);
  const openQuestions = parseOpenQuestions(prompt.openQuestions);

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <div className="mb-4">
        <Link
          href="/ops/product-prompts"
          className="text-xs text-text-muted hover:text-text"
        >
          ← All prompts
        </Link>
      </div>

      <PageHeader
        eyebrow={`${prompt.author} · ${prompt.source} · ${formatDate(prompt.receivedAt)}`}
        title={prompt.epicTitle ?? "Awaiting decomposition"}
        description={prompt.summary ?? undefined}
        actions={<Badge tone="accent">{prompt.status}</Badge>}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Raw prompt</CardTitle>
          <CardDescription>
            As received {formatRelative(prompt.receivedAt)} · stored verbatim
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm text-text-muted bg-surface-muted rounded-md p-4 font-mono">
            {prompt.rawText}
          </pre>
        </CardContent>
      </Card>

      {openQuestions.length > 0 && (
        <Card className="mb-6 border-warning/30">
          <CardHeader>
            <CardTitle>Open questions for the author</CardTitle>
            <CardDescription>
              Mallik needs clarification before these cards are safe to promote.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {openQuestions.map((q, i) => (
                <li key={i} className="text-sm text-text-muted flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-warning inline-block shrink-0" />
                  {q}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <h2 className="text-sm font-medium uppercase tracking-wide text-text-subtle mb-3">
        Cards ({cards.length})
      </h2>

      {cards.length === 0 ? (
        <EmptyState
          title="No cards yet"
          description="Either Mallik hasn't run, or the prompt didn't match any themes."
        />
      ) : (
        <div className="space-y-3">
          {cards.map((card, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle>
                      <span className="text-text-subtle font-normal mr-2 tabular-nums">
                        {idx + 1}.
                      </span>
                      {card.title}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge tone={PRIORITY_TONE[card.priority]}>{card.priority}</Badge>
                    {card.estimate && <Badge tone="neutral">{card.estimate}</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-text-muted">{card.description}</p>

                {card.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {card.labels.map((label) => (
                      <Badge key={label} tone="neutral">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}

                {card.acceptanceCriteria.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-text-subtle mb-1.5">
                      Acceptance criteria
                    </p>
                    <ul className="space-y-1">
                      {card.acceptanceCriteria.map((ac, i) => (
                        <li
                          key={i}
                          className="text-xs text-text-muted flex items-start gap-2"
                        >
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-text-subtle inline-block shrink-0" />
                          {ac}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {card.dependsOn.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-text-subtle mb-1.5">
                      Depends on
                    </p>
                    <ul className="space-y-1">
                      {card.dependsOn.map((dep, i) => (
                        <li key={i} className="text-xs text-text-subtle">
                          → {dep}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
