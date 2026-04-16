import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricTile } from "@/components/ui/metric-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductPromptStatus } from "@prisma/client";
import { formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Mallik inbox" };

const STATUS_TONE: Record<ProductPromptStatus, "neutral" | "accent" | "success" | "warning" | "info"> = {
  received: "warning",
  decomposed: "accent",
  accepted: "success",
  archived: "neutral",
};

function countCards(cards: unknown): number {
  return Array.isArray(cards) ? cards.length : 0;
}

function countQuestions(qs: unknown): number {
  return Array.isArray(qs) ? qs.length : 0;
}

export default async function ProductPromptsPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const [prompts, pendingCount, withQuestions, totalCards] = await Promise.all([
    prisma.productPrompt.findMany({
      where: { OR: [{ organizationId: orgId }, { organizationId: null }] },
      orderBy: { receivedAt: "desc" },
      take: 50,
    }),
    prisma.productPrompt.count({
      where: {
        OR: [{ organizationId: orgId }, { organizationId: null }],
        status: "received",
      },
    }),
    prisma.productPrompt.count({
      where: {
        OR: [{ organizationId: orgId }, { organizationId: null }],
        status: "decomposed",
      },
    }),
    prisma.productPrompt.findMany({
      where: { OR: [{ organizationId: orgId }, { organizationId: null }] },
      select: { cards: true },
    }),
  ]);

  const cardSum = totalCards.reduce((sum, row) => sum + countCards(row.cards), 0);

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <PageHeader
        eyebrow="Mallik — PM agent"
        title="Product prompt inbox"
        description="Unstructured prompts from founders, decomposed into Linear-shaped cards."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricTile label="Awaiting decomposition" value={pendingCount} />
        <MetricTile label="Decomposed, not yet promoted" value={withQuestions} />
        <MetricTile label="Total cards generated" value={cardSum} />
      </div>

      {prompts.length === 0 ? (
        <EmptyState
          title="No prompts captured yet"
          description="Dr. Patel's iMessages (and any other founder channels) will land here once ingestion is wired up."
        />
      ) : (
        <div className="space-y-4">
          {prompts.map((p) => {
            const cards = countCards(p.cards);
            const questions = countQuestions(p.openQuestions);
            return (
              <Link key={p.id} href={`/ops/product-prompts/${p.id}`} className="block">
                <Card className="hover:border-accent/40 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle>
                          {p.epicTitle ?? "Awaiting decomposition"}
                        </CardTitle>
                        <CardDescription>
                          {p.summary ?? p.rawText.slice(0, 160) + (p.rawText.length > 160 ? "…" : "")}
                        </CardDescription>
                      </div>
                      <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-xs text-text-muted">
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">{p.author}</Badge>
                      <Badge tone="neutral">{p.source}</Badge>
                      {cards > 0 && <Badge tone="info">{cards} cards</Badge>}
                      {questions > 0 && (
                        <Badge tone="warning">
                          {questions} open question{questions === 1 ? "" : "s"}
                        </Badge>
                      )}
                    </div>
                    <span>{formatRelative(p.receivedAt)}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
