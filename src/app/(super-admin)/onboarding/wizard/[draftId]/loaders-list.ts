// Server-side loaders for the onboarding *dashboard* page. Kept in the
// same folder as the wizard loaders so the auth shim has a single home.
// Re-exports the auth shim for ergonomics.

import { prisma } from "@/lib/db/prisma";

export { requireImplementationAdminCompat } from "./loaders";

export type DraftSummary = {
  id: string;
  name: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
};
/**
 * Returns all PracticeConfiguration drafts for an organization, decorated with their practice names.
 */
export async function listDraftsForOrganization(
  organizationId: string,
): Promise<DraftSummary[]> {
  const rows = await prisma.practiceConfiguration.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, practiceId: true, updatedAt: true, publishedAt: true },
  });

  const practices = await prisma.practice.findMany({
    where: { organizationId },
    select: { id: true, name: true },
  });
  const practiceMap = new Map(practices.map((p) => [p.id, p.name]));

  return rows.map((r) => ({
    id: r.id,
    name: r.practiceId === "pending" ? "New Practice (Pending)" : (practiceMap.get(r.practiceId) ?? "Unknown Practice"),
    updatedAt: r.updatedAt.toISOString(),
    publishedAt: r.publishedAt?.toISOString() ?? null,
  }));
}

