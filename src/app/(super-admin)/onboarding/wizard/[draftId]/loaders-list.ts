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
 * TODO(EMR-409 / EMR-435): replace with the real query once the
 * `practiceConfiguration` model + filters are defined.
 */
export async function listDraftsForOrganization(
  organizationId: string,
): Promise<DraftSummary[]> {
  const client = prisma as unknown as {
    practiceConfiguration?: {
      findMany: (args: {
        where: { organizationId: string };
        orderBy?: { updatedAt: "desc" };
        select?: Record<string, true>;
      }) => Promise<
        Array<{
          id: string;
          name?: string | null;
          updatedAt?: Date | string | null;
          publishedAt?: Date | string | null;
        }>
      >;
    };
  };

  if (!client.practiceConfiguration?.findMany) {
    // Pre-EMR-409: no model yet, no drafts to list.
    return [];
  }

  const rows = await client.practiceConfiguration.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, updatedAt: true, publishedAt: true },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name ?? null,
    updatedAt:
      r.updatedAt instanceof Date
        ? r.updatedAt.toISOString()
        : (r.updatedAt ?? null),
    publishedAt:
      r.publishedAt instanceof Date
        ? r.publishedAt.toISOString()
        : (r.publishedAt ?? null),
  }));
}
