import { prisma } from "@/lib/db/prisma";
import { rankProductsForPatient } from "@/lib/marketplace/ranking";
import { ProductCard } from "@/components/marketplace/ProductCard";

interface RecommendedForYouProps {
  userId: string;
  organizationId: string;
  limit?: number;
}

/**
 * Server component. Renders per-patient marketplace recommendations backed by
 * the EMR-230 ranking engine. Silent no-op if the authenticated user isn't a
 * patient (e.g. clinician browsing the portal) or if the engine returns no
 * positive-score products.
 *
 * Each card carries the top `reason` from the ranking so the patient
 * understands *why* this product surfaced — the moat's whole point.
 */
export async function RecommendedForYou({
  userId,
  organizationId,
  limit = 4,
}: RecommendedForYouProps) {
  const patient = await prisma.patient.findFirst({
    where: { userId, organizationId },
    select: { id: true },
  });
  if (!patient) return null;

  const ranked = await rankProductsForPatient(patient.id, { limit });

  if (ranked.length === 0) {
    return (
      <section className="mb-14">
        <h2 className="text-xl font-semibold tracking-tight text-text">
          Recommended for You
        </h2>
        <p className="mt-1 mb-6 text-sm text-text-muted">
          We&apos;ll tailor this once you log a few outcomes.
        </p>
        <div className="rounded-lg border border-dashed border-border bg-surface-muted px-6 py-8 text-center">
          <p className="text-sm text-text-muted">
            Start logging how you feel after each dose — the more data, the
            smarter these suggestions get.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-14">
      <h2 className="text-xl font-semibold tracking-tight text-text">
        Recommended for You
      </h2>
      <p className="mt-1 mb-6 text-sm text-text-muted">
        Based on your recent outcomes, regimens, and goals.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {ranked.map((r) => (
          <div key={r.product.id} className="flex flex-col gap-2">
            <ProductCard product={r.product} />
            {r.reasons[0] && (
              <p className="text-xs text-text-muted px-1 line-clamp-2">
                <span className="text-accent" aria-hidden="true">
                  ✦{" "}
                </span>
                {r.reasons[0]}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
