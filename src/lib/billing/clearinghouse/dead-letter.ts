// EMR-217 — Dead-letter queue for clearinghouse submissions
// ---------------------------------------------------------
// Permanent failures (auth that won't recover, malformed gateway response,
// rate-limit exhaustion across N attempts) get routed here. The agent
// continues without blocking; an operator pulls the queue from the admin UI
// (src/app/(operator)/ops/billing/dead-letter).

import { prisma } from "@/lib/db/prisma";
import type { FailureCategory } from "./gateway";

export interface DeadLetterRecord {
  organizationId: string;
  submissionId?: string | null;
  claimId?: string | null;
  gatewayName: string;
  failureCategory: FailureCategory;
  errorMessage: string;
  requestPayload?: string | null;
  responseBody?: string | null;
}

/** Insert a dead-letter row. Idempotent on the composite key (claim,
 *  gateway, message) — repeat failures bump attemptCount + lastFailedAt
 *  rather than creating duplicates. */
export async function recordDeadLetter(input: DeadLetterRecord): Promise<void> {
  const existing = input.claimId
    ? await prisma.clearinghouseDeadLetter.findFirst({
        where: {
          claimId: input.claimId,
          gatewayName: input.gatewayName,
          errorMessage: input.errorMessage,
          resolvedAt: null,
        },
      })
    : null;

  if (existing) {
    await prisma.clearinghouseDeadLetter.update({
      where: { id: existing.id },
      data: {
        attemptCount: { increment: 1 },
        lastFailedAt: new Date(),
        responseBody: input.responseBody ?? existing.responseBody,
      },
    });
    return;
  }

  await prisma.clearinghouseDeadLetter.create({
    data: {
      organizationId: input.organizationId,
      submissionId: input.submissionId ?? null,
      claimId: input.claimId ?? null,
      gatewayName: input.gatewayName,
      failureCategory: input.failureCategory,
      errorMessage: input.errorMessage,
      requestPayload: input.requestPayload ?? null,
      responseBody: input.responseBody ?? null,
    },
  });
}

/** Mark a dead-letter row resolved. Called from the admin UI after the
 *  underlying issue is fixed (e.g. claim re-coded, gateway creds rotated). */
export async function resolveDeadLetter(args: {
  id: string;
  resolvedById: string;
  resolutionNote: string;
}): Promise<void> {
  await prisma.clearinghouseDeadLetter.update({
    where: { id: args.id },
    data: {
      resolvedAt: new Date(),
      resolvedById: args.resolvedById,
      resolutionNote: args.resolutionNote,
    },
  });
}

export async function listOpenDeadLetters(organizationId: string) {
  return prisma.clearinghouseDeadLetter.findMany({
    where: { organizationId, resolvedAt: null },
    orderBy: { lastFailedAt: "desc" },
    take: 200,
  });
}
