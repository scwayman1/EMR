import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { SuppliesView, type Supply } from "./supplies-view";

export const metadata = { title: "Supply Orders" };

const DEMO_SUPPLIES: Supply[] = [
  { id: "sup-1",  name: "Nitrile exam gloves (M)",    unit: "box of 100", quantity: 14, reorderPoint: 10, supplier: "Henry Schein" },
  { id: "sup-2",  name: "Disposable gowns",           unit: "pack of 10", quantity: 6,  reorderPoint: 8,  supplier: "McKesson" },
  { id: "sup-3",  name: "Tongue depressors",          unit: "box of 500", quantity: 2,  reorderPoint: 3,  supplier: "Medline" },
  { id: "sup-4",  name: "Blood pressure cuff (adult)",unit: "each",       quantity: 3,  reorderPoint: 2,  supplier: "Welch Allyn" },
  { id: "sup-5",  name: "Urinalysis test strips",     unit: "bottle",     quantity: 5,  reorderPoint: 4,  supplier: "Siemens Lab" },
  { id: "sup-6",  name: "Vacutainer tubes (SST)",     unit: "pack of 100",quantity: 8,  reorderPoint: 6,  supplier: "BD" },
  { id: "sup-7",  name: "Alcohol prep pads",          unit: "box of 200", quantity: 11, reorderPoint: 5,  supplier: "McKesson" },
  { id: "sup-8",  name: "Sharps container (1 gal)",   unit: "each",       quantity: 4,  reorderPoint: 3,  supplier: "Medline" },
  { id: "sup-9",  name: "Surface disinfecting wipes", unit: "canister",   quantity: 9,  reorderPoint: 10, supplier: "Clorox Pro" },
  { id: "sup-10", name: "Bleach solution (gallon)",   unit: "gallon",     quantity: 2,  reorderPoint: 2,  supplier: "Clorox Pro" },
  { id: "sup-11", name: "Hand sanitizer (500ml)",     unit: "bottle",     quantity: 18, reorderPoint: 6,  supplier: "Purell" },
  { id: "sup-12", name: "Printer paper (letter)",     unit: "ream",       quantity: 12, reorderPoint: 5,  supplier: "Staples" },
  { id: "sup-13", name: "Ballpoint pens",             unit: "box of 12",  quantity: 5,  reorderPoint: 3,  supplier: "Staples" },
  { id: "sup-14", name: "Exam table paper",           unit: "roll",       quantity: 6,  reorderPoint: 5,  supplier: "Medline" },
  { id: "sup-15", name: "Thermometer probe covers",   unit: "box of 100", quantity: 3,  reorderPoint: 4,  supplier: "Welch Allyn" },
];

export default async function SuppliesPage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Team"
        title="Supply orders"
        description="Track office supplies, reorder points, and supplier fulfillment."
      />
      <SuppliesView initialSupplies={DEMO_SUPPLIES} />
    </PageShell>
  );
}
