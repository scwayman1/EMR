import { prisma } from "@/lib/db/prisma";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { cohortBuilderAgent } from "@/lib/agents/research/cohort-builder-agent";
import { rankProductsForPatient } from "@/lib/marketplace/ranking";
import {
  getPopularProductsInCohort,
  MIN_COHORT_SIZE,
} from "@/lib/marketplace/cohort-insights";

interface PatientsLikeYouProps {
  userId: string;
  organizationId: string;
  limit?: number;
}

/**
 * Server component. Second patient-visible marketplace surface.
 *
 * Distinct from <RecommendedForYou /> (EMR-268): that widget answers "what
 * should YOU try" from your own outcomes. This widget answers "what do
 * people LIKE YOU actually use" — cohort popularity with a personal-fit
 * callout.
 *
 * Fuses two agents:
 *   - cohortBuilderAgent (EMR-269)  → finds the cohort
 *   - rankProductsForPatient (EMR-230) → annotates each cohort-popular
 *     product with the matching personal-fit reason, if any
 *
 * HIPAA min-cell protection: hides per-product counts when cohort size
 * is below MIN_COHORT_SIZE. Hides the whole section when the current
 * user has no patient row or no memory tags (nothing to build a cohort
 * around).
 */
export async function PatientsLikeYou({
  userId,
  organizationId,
  limit = 3,
}: PatientsLikeYouProps) {
  const patient = await prisma.patient.findFirst({
    where: { userId, organizationId },
    select: { id: true },
  });
  if (!patient) return null;

  // Pick the latest active memory's first tag as the cohort anchor.
  const latestMemory = await prisma.patientMemory.findFirst({
    where: {
      patientId: patient.id,
      tags: { isEmpty: false },
      OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    select: { tags: true },
  });
  const memoryTag = latestMemory?.tags[0];
  if (!memoryTag) return null;

  // Call the cohort-builder agent directly — the agent only uses ctx.log,
  // so a minimal stub satisfies its contract without spinning up the
  // orchestration runner.
  const stubCtx = { log: () => {} } as unknown as Parameters<
    typeof cohortBuilderAgent.run
  >[1];

  const [cohort, ranked] = await Promise.all([
    cohortBuilderAgent.run(
      {
        organizationId,
        memoryTag,
        activeRegimenOnly: true,
      },
      stubCtx,
    ),
    rankProductsForPatient(patient.id, { limit: 8, organizationId }),
  ]);

  // Drop this patient from the cohort — "people like me" shouldn't
  // include me.
  const peerIds = cohort.patientIds.filter((id) => id !== patient.id);

  if (peerIds.length < MIN_COHORT_SIZE) {
    return (
      <section className="mb-14">
        <h2 className="text-xl font-semibold tracking-tight text-text">
          Patients Like You
        </h2>
        <p className="mt-1 mb-6 text-sm text-text-muted">
          Based on patients tracking <em>{memoryTag}</em>, like you.
        </p>
        <div className="rounded-lg border border-dashed border-border bg-surface-muted px-6 py-8 text-center">
          <p className="text-sm text-text-muted">
            Building cohort data — we need at least {MIN_COHORT_SIZE} patients
            with the same focus before we can share what&apos;s working for
            them.
          </p>
        </div>
      </section>
    );
  }

  const popular = await getPopularProductsInCohort(peerIds, {
    organizationId,
    limit,
  });

  if (popular.length === 0) return null;

  // Index the personal ranking so we can attach a personal-fit reason
  // to any cohort-popular product that also made the patient's top 8.
  const personalByProductId = new Map<string, { score: number; reasons: string[] }>();
  for (const r of ranked) {
    personalByProductId.set(r.product.id, { score: r.score, reasons: r.reasons });
  }

  return (
    <section className="mb-14">
      <h2 className="text-xl font-semibold tracking-tight text-text">
        Patients Like You
      </h2>
      <p className="mt-1 mb-6 text-sm text-text-muted">
        {peerIds.length} patients tracking <em>{memoryTag}</em> — here&apos;s
        what&apos;s in their active regimens.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {popular.map((row) => {
          const personal = personalByProductId.get(row.product.id);
          return (
            <div key={row.product.id} className="flex flex-col gap-2">
              <ProductCard product={row.product} />
              <div className="px-1 space-y-1">
                <p className="text-xs text-text-muted">
                  <span className="text-accent" aria-hidden="true">
                    ◉{" "}
                  </span>
                  {row.regimenCount} of {peerIds.length} cohort members use this
                </p>
                {personal?.reasons[0] && (
                  <p className="text-xs text-text-muted line-clamp-2">
                    <span className="text-accent" aria-hidden="true">
                      ✦{" "}
                    </span>
                    {personal.reasons[0]}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
