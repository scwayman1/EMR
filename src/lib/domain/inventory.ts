// Cannabis Inventory Tracking
// Stock levels, low-stock alerts, reorder points.

export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock" | "discontinued";

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  brand: string | null;
  productType: string;
  sku?: string;
  upc?: string;
  currentQuantity: number;
  unit: string; // "bottles", "grams", "units"
  reorderPoint: number;
  reorderQuantity: number;
  costPerUnit?: number;
  supplierName?: string;
  lastRestockedAt?: string;
  lastCountedAt: string;
  status: InventoryStatus;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  type: "restock" | "dispense" | "count_adjustment" | "discontinue";
  quantityChange: number;
  notes?: string;
  performedBy: string;
  performedAt: string;
}

export function classifyStatus(currentQuantity: number, reorderPoint: number): InventoryStatus {
  if (currentQuantity <= 0) return "out_of_stock";
  if (currentQuantity <= reorderPoint) return "low_stock";
  return "in_stock";
}

export const STATUS_STYLES: Record<InventoryStatus, { bg: string; text: string; label: string }> = {
  in_stock: { bg: "bg-emerald-50", text: "text-emerald-700", label: "In stock" },
  low_stock: { bg: "bg-amber-50", text: "text-amber-700", label: "Low stock" },
  out_of_stock: { bg: "bg-red-50", text: "text-red-700", label: "Out of stock" },
  discontinued: { bg: "bg-gray-100", text: "text-gray-600", label: "Discontinued" },
};
