import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";
import {
  lookupMedication,
  getAllMedications,
  type MedicationExplanation,
} from "@/lib/domain/medication-explainer";

export const metadata = { title: "Medication Explainer" };

// ---------------------------------------------------------------------------
// Medication Explainer Page — EMR-45 / EMR-133
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  cannabis: "Cannabis",
  prescription: "Prescription",
  supplement: "Supplement",
  otc: "Over the counter",
};

const CATEGORY_TONES: Record<string, "accent" | "info" | "neutral" | "warning"> = {
  cannabis: "accent",
  prescription: "info",
  supplement: "neutral",
  otc: "warning",
};

function ExplainerCard({ med }: { med: MedicationExplanation }) {
  return (
    <Card tone="raised" className="overflow-hidden">
      <CardContent className="py-6 px-5 md:px-6">
        {/* Cartoon hero — large emoji illustration on a colored "stage" */}
        <div className="flex justify-center mb-5 -mt-2">
          <div
            aria-hidden="true"
            className="relative flex h-24 w-24 items-center justify-center rounded-full bg-accent-soft text-5xl shadow-inner"
          >
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-3 w-16 rounded-full bg-text/5 blur-sm" />
            {med.emoji}
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
              <h3 className="font-display text-xl text-text tracking-tight">
                {med.name}
              </h3>
              <Badge tone={CATEGORY_TONES[med.category] ?? "neutral"}>
                {CATEGORY_LABELS[med.category] ?? med.category}
              </Badge>
            </div>
            <p className="text-[15px] text-text-muted leading-relaxed mb-4 text-center">
              {med.simpleWhat}
            </p>

            <div className="space-y-3">
              <div className="rounded-lg bg-accent-soft/40 border border-accent/10 px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-accent mb-1">
                  How it works
                </p>
                <p className="text-sm text-text-muted">{med.simpleHow}</p>
              </div>
              <div className="rounded-lg bg-surface-muted/60 border border-border/50 px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                  Where in your body
                </p>
                <p className="text-sm text-text-muted">{med.simpleWhere}</p>
              </div>
              <div className="rounded-lg bg-highlight-soft/40 border border-highlight/10 px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--highlight-hover)] mb-1">
                  What you might notice
                </p>
                <p className="text-sm text-text-muted">{med.simpleSideEffects}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function MedicationExplainerPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: {
      dosingRegimens: {
        where: { active: true },
        include: { product: true },
      },
      medications: {
        where: { active: true },
      },
    },
  });

  if (!patient) redirect("/portal/intake");

  // Match patient's medications to explainer database
  const patientMeds: MedicationExplanation[] = [];
  const seen = new Set<string>();

  // Cannabis products from dosing regimens
  for (const regimen of patient.dosingRegimens) {
    const product = (regimen as any).product;
    if (!product) continue;
    // Try to match by product type or name
    const match =
      lookupMedication(product.name) ??
      lookupMedication(product.productType);
    if (match && !seen.has(match.name)) {
      seen.add(match.name);
      patientMeds.push(match);
    }
  }

  // Conventional medications
  for (const med of patient.medications) {
    const match =
      lookupMedication(med.name) ??
      (med.genericName ? lookupMedication(med.genericName) : null);
    if (match && !seen.has(match.name)) {
      seen.add(match.name);
      patientMeds.push(match);
    }
  }

  // All medications for the reference section
  const allMeds = getAllMedications();
  const cannabisMeds = allMeds.filter((m) => m.category === "cannabis");
  const prescriptionMeds = allMeds.filter((m) => m.category === "prescription" || m.category === "otc");
  const supplements = allMeds.filter((m) => m.category === "supplement");

  return (
    <PageShell maxWidth="max-w-[860px]">
      <PatientSectionNav section="health" />

      <div className="mb-10">
        <Eyebrow className="mb-3">Medication explainer</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
          How your medicines work
        </h1>
        <p className="text-[15px] text-text-muted mt-3 leading-relaxed max-w-2xl">
          Simple explanations of every medicine, supplement, and cannabis product
          &mdash; what it does, how it works, and what to expect. Written so
          anyone can understand.
        </p>
      </div>

      {/* ── Your medications ─────────────────────────── */}
      {patientMeds.length > 0 && (
        <>
          <section className="mb-10">
            <h2 className="font-display text-2xl text-text tracking-tight mb-6 flex items-center gap-2">
              <LeafSprig size={18} className="text-accent/70" />
              Your medications
            </h2>
            <div className="space-y-5">
              {patientMeds.map((med) => (
                <ExplainerCard key={med.name} med={med} />
              ))}
            </div>
          </section>
          <EditorialRule className="my-10" />
        </>
      )}

      {/* ── Cannabis products ────────────────────────── */}
      <section className="mb-10">
        <h2 className="font-display text-2xl text-text tracking-tight mb-6 flex items-center gap-2">
          <span className="text-lg">{"\uD83C\uDF3F"}</span>
          Cannabis products
        </h2>
        <div className="space-y-5">
          {cannabisMeds.map((med) => (
            <ExplainerCard key={med.name} med={med} />
          ))}
        </div>
      </section>

      <EditorialRule className="my-10" />

      {/* ── Common prescriptions ─────────────────────── */}
      <section className="mb-10">
        <h2 className="font-display text-2xl text-text tracking-tight mb-6 flex items-center gap-2">
          <span className="text-lg">{"\uD83D\uDC8A"}</span>
          Common prescriptions
        </h2>
        <div className="space-y-5">
          {prescriptionMeds.map((med) => (
            <ExplainerCard key={med.name} med={med} />
          ))}
        </div>
      </section>

      <EditorialRule className="my-10" />

      {/* ── Supplements ──────────────────────────────── */}
      <section className="mb-10">
        <h2 className="font-display text-2xl text-text tracking-tight mb-6 flex items-center gap-2">
          <span className="text-lg">{"\u2728"}</span>
          Supplements
        </h2>
        <div className="space-y-5">
          {supplements.map((med) => (
            <ExplainerCard key={med.name} med={med} />
          ))}
        </div>
      </section>

      {/* ── Disclaimer ───────────────────────────────── */}
      <div className="mt-8 mb-4 text-center">
        <p className="text-xs text-text-subtle max-w-md mx-auto leading-relaxed">
          These explanations are simplified for understanding. Always follow
          your care team&apos;s specific instructions for your medications.
        </p>
        <LeafSprig size={24} className="text-accent/40 mx-auto mt-6" />
      </div>
    </PageShell>
  );
}
