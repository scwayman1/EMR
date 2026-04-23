import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/badge";
import { InventoryView } from "./inventory-view";
import { classifyStatus, type InventoryItem } from "@/lib/domain/inventory";

export const metadata = { title: "Cannabis Inventory" };

// ---------------------------------------------------------------------------
// Demo seed (8 items reflecting marketplace product catalogue)
// ---------------------------------------------------------------------------

function buildDemoItems(): InventoryItem[] {
  const seeds: Array<Omit<InventoryItem, "status">> = [
    {
      id: "inv-1",
      productId: "p-rythm-bls",
      productName: "Blue Dream 1g Cartridge",
      brand: "Rythm",
      productType: "Vape Cartridge",
      sku: "RYT-BD-1G",
      upc: "850001234560",
      currentQuantity: 42,
      unit: "units",
      reorderPoint: 20,
      reorderQuantity: 60,
      costPerUnit: 22,
      supplierName: "GTI Distribution",
      lastRestockedAt: "2026-04-02T14:30:00Z",
      lastCountedAt: "2026-04-15T09:00:00Z",
    },
    {
      id: "inv-2",
      productId: "p-cresco-tincture",
      productName: "Live Budder 1:1 Tincture 30ml",
      brand: "Cresco",
      productType: "Tincture",
      sku: "CRC-LB11-30",
      upc: "850001234577",
      currentQuantity: 8,
      unit: "bottles",
      reorderPoint: 10,
      reorderQuantity: 24,
      costPerUnit: 35,
      supplierName: "Cresco Labs",
      lastRestockedAt: "2026-03-18T11:15:00Z",
      lastCountedAt: "2026-04-15T09:00:00Z",
    },
    {
      id: "inv-3",
      productId: "p-curaleaf-rso",
      productName: "RSO Capsules 25mg (30ct)",
      brand: "Curaleaf",
      productType: "Capsule",
      sku: "CRL-RSO-25",
      upc: "850001234584",
      currentQuantity: 0,
      unit: "bottles",
      reorderPoint: 6,
      reorderQuantity: 18,
      costPerUnit: 45,
      supplierName: "Curaleaf Wholesale",
      lastRestockedAt: "2026-02-21T10:00:00Z",
      lastCountedAt: "2026-04-15T09:00:00Z",
    },
    {
      id: "inv-4",
      productId: "p-wyld-gummies",
      productName: "Raspberry CBN Gummies (20pk)",
      brand: "Wyld",
      productType: "Edible",
      sku: "WYD-RB-CBN",
      upc: "850001234591",
      currentQuantity: 76,
      unit: "units",
      reorderPoint: 25,
      reorderQuantity: 60,
      costPerUnit: 18,
      supplierName: "Wyld Brands",
      lastRestockedAt: "2026-04-10T15:45:00Z",
      lastCountedAt: "2026-04-15T09:00:00Z",
    },
    {
      id: "inv-5",
      productId: "p-papa-barkley-balm",
      productName: "Releaf CBD/THC Balm 50ml",
      brand: "Papa & Barkley",
      productType: "Topical",
      sku: "PB-RLF-50",
      upc: "850001234607",
      currentQuantity: 14,
      unit: "jars",
      reorderPoint: 15,
      reorderQuantity: 36,
      costPerUnit: 28,
      supplierName: "Papa & Barkley",
      lastRestockedAt: "2026-03-28T08:20:00Z",
      lastCountedAt: "2026-04-15T09:00:00Z",
    },
    {
      id: "inv-6",
      productId: "p-stiiizy-pod",
      productName: "Sour Diesel Pod 0.5g",
      brand: "Stiiizy",
      productType: "Vape Pod",
      sku: "STZ-SD-05",
      upc: "850001234614",
      currentQuantity: 64,
      unit: "units",
      reorderPoint: 30,
      reorderQuantity: 80,
      costPerUnit: 19,
      supplierName: "Stiiizy Direct",
      lastRestockedAt: "2026-04-08T13:10:00Z",
      lastCountedAt: "2026-04-15T09:00:00Z",
    },
    {
      id: "inv-7",
      productId: "p-aeriz-flower",
      productName: "Wedding Cake Flower 3.5g",
      brand: "Aeriz",
      productType: "Flower",
      sku: "AER-WC-3.5",
      upc: "850001234621",
      currentQuantity: 6,
      unit: "jars",
      reorderPoint: 20,
      reorderQuantity: 50,
      costPerUnit: 32,
      supplierName: "Aeriz Cultivation",
      lastRestockedAt: "2026-03-30T09:00:00Z",
      lastCountedAt: "2026-04-15T09:00:00Z",
    },
    {
      id: "inv-8",
      productId: "p-cann-mints",
      productName: "Peppermint 5mg THC Mints",
      brand: "Kiva",
      productType: "Edible",
      sku: "KVA-PEP-5",
      upc: "850001234638",
      currentQuantity: 102,
      unit: "tins",
      reorderPoint: 30,
      reorderQuantity: 50,
      costPerUnit: 14,
      supplierName: "Kiva Confections",
      lastRestockedAt: "2026-04-12T16:00:00Z",
      lastCountedAt: "2026-04-15T09:00:00Z",
    },
  ];

  return seeds.map((item) => ({
    ...item,
    status: classifyStatus(item.currentQuantity, item.reorderPoint),
  }));
}

export default async function InventoryPage() {
  // Operator-scope: requireUser ensures a session is present
  await requireUser();

  const items = buildDemoItems();
  const lowStockCount = items.filter(
    (i) => i.status === "low_stock" || i.status === "out_of_stock",
  ).length;

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Operations"
        title="Cannabis Inventory"
        description="Track stock levels, reorder points, and supplier flow across the dispensary."
        actions={
          lowStockCount > 0 ? (
            <Badge tone="warning" className="text-xs">
              {lowStockCount} {lowStockCount === 1 ? "item" : "items"} need attention
            </Badge>
          ) : (
            <Badge tone="success" className="text-xs">All stocked</Badge>
          )
        }
      />

      <InventoryView initialItems={items} />
    </PageShell>
  );
}
