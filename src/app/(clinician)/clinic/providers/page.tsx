import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ProviderCard } from "@/components/clinician/provider-card";
import {
  rankProviders,
  type ProviderRecord,
} from "@/lib/domain/provider-directory";

export const metadata = { title: "Providers" };

// Server component — lists clinicians (providers) in the current user's
// organization. Supports URL-driven search via ?q=.
export default async function ProvidersPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const user = await requireUser();
  const rawQuery = (searchParams?.q ?? "").trim();

  if (!user.organizationId) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Providers"
          title="Provider directory"
          description="View and contact providers in your organization."
        />
        <EmptyState
          title="No organization"
          description="Your account isn't attached to an organization yet."
        />
      </PageShell>
    );
  }

  // Coarse server-side filter. We build an OR across name/specialty/NPI to
  // keep the DB query tight before handing off to rankProviders() for
  // final ranking and tie-breaking.
  const providers = await prisma.provider.findMany({
    where: {
      organizationId: user.organizationId,
      active: true,
      ...(rawQuery
        ? {
            OR: [
              { user: { firstName: { contains: rawQuery, mode: "insensitive" } } },
              { user: { lastName: { contains: rawQuery, mode: "insensitive" } } },
              { title: { contains: rawQuery, mode: "insensitive" } },
              { specialties: { has: rawQuery } },
              { claims: { some: { renderingNpi: { contains: rawQuery } } } },
              { claims: { some: { billingNpi: { contains: rawQuery } } } },
            ],
          }
        : {}),
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
      // Pull the most recent claim with a rendering NPI to surface the
      // provider's NPI in the directory. renderingNpi is what identifies
      // the clinician to payers and is the relevant field here.
      claims: {
        where: { renderingNpi: { not: null } },
        orderBy: { serviceDate: "desc" },
        take: 1,
        select: { renderingNpi: true },
      },
    },
  });

  // Per-provider distinct-patient count (via encounters). One aggregate
  // query — providerId -> count of distinct patientIds.
  const providerIds = providers.map((p) => p.id);
  const encounterGroups =
    providerIds.length > 0
      ? await prisma.encounter.groupBy({
          by: ["providerId", "patientId"],
          where: {
            providerId: { in: providerIds },
            organizationId: user.organizationId,
          },
        })
      : [];
  const assignedCounts = new Map<string, number>();
  for (const group of encounterGroups) {
    if (!group.providerId) continue;
    assignedCounts.set(
      group.providerId,
      (assignedCounts.get(group.providerId) ?? 0) + 1,
    );
  }

  const records: Array<{ record: ProviderRecord; userId: string }> = providers.map(
    (p) => ({
      record: {
        id: p.id,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        title: p.title,
        specialties: p.specialties,
        npi: p.claims[0]?.renderingNpi ?? null,
        assignedPatientCount: assignedCounts.get(p.id) ?? 0,
      },
      userId: p.user.id,
    }),
  );

  const userIdByProviderId = new Map(
    records.map(({ record, userId }) => [record.id, userId]),
  );

  const ranked = rankProviders(
    records.map(({ record }) => record),
    rawQuery || undefined,
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Providers"
        title="Provider directory"
        description="Search clinicians in your organization for patient routing and cross-clinician collaboration."
      />

      <form
        method="GET"
        className="mb-8 flex items-center gap-3 max-w-xl"
        role="search"
      >
        <Input
          type="search"
          name="q"
          defaultValue={rawQuery}
          placeholder="Search by name, specialty, or NPI"
          aria-label="Search providers"
          className="flex-1"
        />
        <button
          type="submit"
          className="h-10 px-4 text-sm font-medium text-accent rounded-md border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors"
        >
          Search
        </button>
        {rawQuery && (
          <Link
            href="/clinic/providers"
            className="h-10 px-4 inline-flex items-center text-sm text-text-muted hover:text-text transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {ranked.length === 0 ? (
        <EmptyState
          title={rawQuery ? "No providers match your search" : "No providers found"}
          description={
            rawQuery
              ? `Nothing matched "${rawQuery}". Try a different name, specialty, or NPI.`
              : "There are no active providers in your organization yet."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.map((record) => (
            <ProviderCard
              key={record.id}
              provider={record}
              messageRecipientUserId={
                userIdByProviderId.get(record.id) ?? ""
              }
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
