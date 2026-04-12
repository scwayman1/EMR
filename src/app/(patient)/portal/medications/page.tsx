import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "My Medications" };

/* ---------- Helpers ---------- */

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  oil: "Oil",
  tincture: "Tincture",
  capsule: "Capsule",
  flower: "Flower",
  vape_cartridge: "Vape cartridge",
  edible: "Edible",
  topical: "Topical",
  suppository: "Suppository",
  spray: "Spray",
  other: "Other",
};

const ROUTE_FRIENDLY: Record<string, string> = {
  oral: "By mouth",
  sublingual: "Under the tongue",
  inhalation: "Inhaled",
  topical: "Applied to skin",
  rectal: "Rectal",
  vaginal: "Vaginal",
};

function formatRatio(thc: number | null, cbd: number | null): string | null {
  if (thc == null || cbd == null || (thc === 0 && cbd === 0)) return null;
  if (cbd === 0) return `${thc}:0 THC:CBD`;
  if (thc === 0) return `0:${cbd} THC:CBD`;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(Math.round(thc * 10), Math.round(cbd * 10));
  const r1 = Math.round((thc * 10) / d);
  const r2 = Math.round((cbd * 10) / d);
  return `${r1}:${r2}`;
}

/* ---------- Page ---------- */

export default async function MedicationsPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
  });

  const regimens = patient
    ? await prisma.dosingRegimen.findMany({
        where: { patientId: patient.id, active: true },
        include: { product: true },
        orderBy: { startDate: "desc" },
      })
    : [];

  // Daily totals
  const totalThcPerDay = regimens.reduce(
    (sum: number, r: any) => sum + (r.calculatedThcMgPerDay ?? 0),
    0
  );
  const totalCbdPerDay = regimens.reduce(
    (sum: number, r: any) => sum + (r.calculatedCbdMgPerDay ?? 0),
    0
  );

  return (
    <PageShell maxWidth="max-w-[960px]">
      {/* ==================== Hero ==================== */}
      <PatientSectionNav section="health" />
      <div className="mb-10">
        <Eyebrow className="mb-3">Medications</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
          Your cannabis care plan
        </h1>
        <p className="text-[15px] text-text-muted mt-3 leading-relaxed max-w-2xl">
          Here you will find everything about your prescribed cannabis
          medications — what to take, how much, and when. Your care team has
          tailored these recommendations just for you.
        </p>
      </div>

      {/* ==================== Active regimens ==================== */}
      {regimens.length === 0 ? (
        <EmptyState
          title="No medications prescribed yet"
          description="Once your clinician sets up a cannabis care plan, your medications and dosing instructions will appear here."
        />
      ) : (
        <>
          {/* ── Regimen cards ────────────────────────────── */}
          <section className="space-y-6">
            {regimens.map((regimen: any) => {
              const product = regimen.product;
              const ratio = formatRatio(
                regimen.calculatedThcMgPerDose,
                regimen.calculatedCbdMgPerDose
              );

              return (
                <Card key={regimen.id} tone="raised">
                  <CardHeader>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {product && (
                        <Badge tone="accent">
                          {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
                        </Badge>
                      )}
                      {product?.route && (
                        <Badge tone="neutral">
                          {ROUTE_FRIENDLY[product.route] ?? product.route}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-2xl">
                      {product?.name ?? "Your medication"}
                    </CardTitle>
                    {product?.brand && (
                      <CardDescription>{product.brand}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* ── How to take it ──────────────────── */}
                    {regimen.patientInstructions && (
                      <div className="rounded-xl bg-accent-soft border border-accent/15 px-5 py-4">
                        <div className="flex items-center gap-2 mb-2">
                          <LeafSprig size={16} className="text-accent/70" />
                          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
                            How to take it
                          </p>
                        </div>
                        <p className="font-display text-lg text-text leading-relaxed">
                          {regimen.patientInstructions}
                        </p>
                      </div>
                    )}

                    {/* ── Dose visualization ─────────────── */}
                    <div className="rounded-xl bg-surface-muted/60 border border-border/50 px-5 py-4">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-3">
                        Each dose
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-display text-2xl text-text tabular-nums">
                          {regimen.volumePerDose} {regimen.volumeUnit}
                        </span>
                        <span className="text-text-subtle text-lg">=</span>
                        <div className="flex items-center gap-2">
                          {regimen.calculatedThcMgPerDose != null && (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent-soft border border-accent/15">
                              <span className="font-display text-lg text-accent tabular-nums font-medium">
                                {regimen.calculatedThcMgPerDose.toFixed(1)}
                              </span>
                              <span className="text-xs text-accent">mg THC</span>
                            </span>
                          )}
                          {regimen.calculatedThcMgPerDose != null &&
                            regimen.calculatedCbdMgPerDose != null && (
                              <span className="text-text-subtle text-sm">+</span>
                            )}
                          {regimen.calculatedCbdMgPerDose != null && (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-highlight-soft border border-highlight/15">
                              <span className="font-display text-lg text-[color:var(--highlight)] tabular-nums font-medium">
                                {regimen.calculatedCbdMgPerDose.toFixed(1)}
                              </span>
                              <span className="text-xs text-[color:var(--highlight)]">mg CBD</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {ratio && (
                        <p className="text-xs text-text-subtle mt-2 tabular-nums">
                          Ratio: {ratio}
                        </p>
                      )}
                    </div>

                    {/* ── Timing ──────────────────────────── */}
                    <div className="flex items-start gap-6 flex-wrap">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                          Frequency
                        </p>
                        <p className="text-sm text-text">
                          {regimen.frequencyPerDay === 1
                            ? "Once daily"
                            : regimen.frequencyPerDay === 2
                              ? "Twice daily"
                              : `${regimen.frequencyPerDay} times daily`}
                        </p>
                      </div>
                      {regimen.timingInstructions && (
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                            When
                          </p>
                          <p className="text-sm text-text">
                            {regimen.timingInstructions}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                          Since
                        </p>
                        <p className="text-sm text-text font-display tabular-nums">
                          {formatDate(regimen.startDate)}
                        </p>
                      </div>
                    </div>

                    {/* ── Log a dose (stub) ───────────────── */}
                    <div className="pt-2">
                      <Button variant="highlight" size="md">
                        Log a dose
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <EditorialRule className="my-10" />

          {/* ==================== Daily summary ==================== */}
          <section>
            <h2 className="font-display text-2xl text-text tracking-tight mb-6">
              Your daily totals
            </h2>
            <Card tone="raised">
              <CardContent className="pt-6 pb-6">
                <p className="text-sm text-text-muted mb-4">
                  Across all your medications, you are taking:
                </p>
                <div className="flex items-center gap-8 flex-wrap">
                  <div className="text-center">
                    <span className="font-display text-4xl text-accent tabular-nums font-medium">
                      {totalThcPerDay.toFixed(1)}
                    </span>
                    <p className="text-sm text-text-muted mt-1">mg THC per day</p>
                  </div>
                  <div className="text-center">
                    <span className="font-display text-4xl text-[color:var(--highlight)] tabular-nums font-medium">
                      {totalCbdPerDay.toFixed(1)}
                    </span>
                    <p className="text-sm text-text-muted mt-1">mg CBD per day</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <EditorialRule className="my-10" />
        </>
      )}

      {/* ==================== Understanding your dose ==================== */}
      <section className="mb-4">
        <h2 className="font-display text-2xl text-text tracking-tight mb-6">
          Understanding your dose
        </h2>
        <Card tone="raised">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LeafSprig size={16} className="text-accent/80" />
              Milligrams vs. millilitres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose-clinical">
              <p className="text-text-muted leading-relaxed">
                Your clinician prescribes in{" "}
                <strong>milligrams (mg)</strong> — this is the amount of active
                cannabinoid you receive. The <strong>volume (mL)</strong> is
                how much liquid, oil, or product you measure out, and it depends
                on the product&apos;s concentration.
              </p>
              <p className="text-text-muted leading-relaxed">
                If your product changes, the volume may change, but your{" "}
                <strong>mg dose stays the same</strong>. This way, your
                therapeutic dose remains consistent no matter which product you
                use.
              </p>
              <p className="text-text-muted leading-relaxed">
                Always follow the instructions your care team provides. If
                anything feels unclear, reach out through the{" "}
                <strong>Messages</strong> tab — your team is here to help.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
