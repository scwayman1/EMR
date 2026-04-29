import Link from "next/link";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  buildWalletCard,
  formatMedicationLine,
  walletCardCacheKey,
  WALLET_CARD_DIMENSIONS_MM,
  type WalletCardData,
} from "@/lib/billing/wallet-card";

export const metadata = { title: "Medication Wallet Cards" };

// Sample preview deck — wired to real `prisma.patient` in the next iteration
// when we have a confirmed cannabis-rx + supplements join. Surface today
// validates the layout + cache hashing across the patient population.
const PREVIEW_CARDS: WalletCardData[] = [
  buildWalletCard({
    patient: {
      fullName: "Maya Castillo",
      dateOfBirth: "1986-03-12",
      mrn: "MRN-A0042",
      allergiesSummary: "PCN, sulfa",
    },
    practiceName: "Leafjourney Care · Boulder",
    practiceContact: "(720) 555-0144",
    medications: [
      { name: "CBD oil 25mg/mL", frequency: "1 mL sublingual at bedtime", category: "cannabis", indication: "insomnia" },
      { name: "Atorvastatin 20mg", frequency: "Once daily", category: "rx" },
      { name: "Sertraline 50mg", frequency: "Once daily", category: "rx" },
      { name: "Magnesium glycinate 400mg", frequency: "Once daily", category: "supplement" },
      { name: "Vitamin D3 2000 IU", frequency: "Once daily", category: "supplement" },
    ],
    emergencyContact: { name: "Diego Castillo", relationship: "Spouse", phone: "(720) 555-0190" },
  }),
  buildWalletCard({
    patient: {
      fullName: "Jonas Reiter",
      dateOfBirth: "1971-11-04",
      mrn: "MRN-B0119",
      allergiesSummary: "NKDA",
    },
    practiceName: "Leafjourney Care · Berlin",
    practiceContact: "+49 30 1234 5678",
    medications: [
      { name: "THC:CBD 1:1 5mg", frequency: "Twice daily oral", category: "cannabis", indication: "neuropathic pain" },
      { name: "Pregabalin 75mg", frequency: "Twice daily", category: "rx" },
      { name: "Metformin 500mg", frequency: "With meals, 2× daily", category: "rx" },
      { name: "Lisinopril 10mg", frequency: "Once daily", category: "rx" },
      { name: "Aspirin 81mg", frequency: "Once daily", category: "rx" },
      { name: "B12 1000mcg", frequency: "Weekly", category: "supplement" },
      { name: "Omega-3 1000mg", frequency: "Once daily", category: "supplement" },
      { name: "Curcumin 500mg", frequency: "Once daily", category: "supplement" },
      { name: "Probiotic 50B CFU", frequency: "Once daily", category: "supplement" },
    ],
    emergencyContact: { name: "Eva Reiter", relationship: "Daughter", phone: "+49 30 1234 5680" },
  }),
];

export default function WalletCardsPage() {
  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Patient experience"
        title="Medication wallet cards"
        description="Credit-card-sized printable summary patients can carry. Auto-updates when meds change. Renderer is layout-agnostic — same data drives the print sheet, the portal preview, and Apple Wallet."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Generated this month" value="—" hint="Wire to FinancialEvent" size="md" />
        <StatCard label="Patients enrolled" value={String(PREVIEW_CARDS.length)} size="md" />
        <StatCard
          label="Card size"
          value={`${WALLET_CARD_DIMENSIONS_MM.widthMm}×${WALLET_CARD_DIMENSIONS_MM.heightMm}mm`}
          hint="ISO 7810 ID-1"
          size="md"
        />
        <StatCard label="Default language" value="English" hint="Translate via EMR-122" size="md" />
      </div>

      {PREVIEW_CARDS.length === 0 ? (
        <EmptyState
          title="No wallet cards yet"
          description="Cards generate automatically when a patient has at least one active medication."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PREVIEW_CARDS.map((card) => (
            <WalletCardPreview key={card.patient.mrn} card={card} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function WalletCardPreview({ card }: { card: WalletCardData }) {
  const cacheKey = walletCardCacheKey(card);
  return (
    <Card tone="raised">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{card.patient.fullName}</CardTitle>
            <CardDescription>
              MRN {card.patient.mrn} · DOB {card.patient.dateOfBirth}
            </CardDescription>
          </div>
          <Badge tone="info">cache {cacheKey}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-surface-muted border border-border rounded-lg p-4 mb-3">
          <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-2">
            {card.practiceName}
          </div>
          <div className="text-xs text-text-muted mb-2">
            Allergies: {card.patient.allergiesSummary || "NKDA"}
          </div>
          <ul className="text-xs text-text space-y-0.5 tabular-nums">
            {card.medications.map((m, i) => (
              <li key={i}>{formatMedicationLine(m)}</li>
            ))}
          </ul>
          {card.truncated && (
            <div className="text-[10px] text-text-subtle mt-2">
              +{card.truncatedCount} more on portal
            </div>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-text-subtle">
          <span>
            {card.medications.length} meds · {card.emergencyContact?.name ?? "no emergency contact"}
          </span>
          <Link
            href={`/portal/wallet-card/${card.patient.mrn}`}
            className="text-accent hover:underline"
          >
            Print →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
