/**
 * Dispensary Revenue + Inventory Module (EMR-183)
 * -----------------------------------------------
 * Surfaces gross / net economics for the dispensary side of the
 * practice (Product / Order / OrderItem) alongside the existing
 * claims revenue cockpit. Practices that bundle a dispensary alongside
 * the medical workflow need both views in one screen — claims pay the
 * lights, but product margin is where the practice grows.
 *
 * Computations:
 *   - gross    = sum(OrderItem.totalPrice) on non-cancelled orders
 *   - refunded = sum(OrderItem.totalPrice) on refunded orders
 *   - tax      = sum(Order.tax) on counted orders
 *   - net      = gross − refunded − tax
 *   - margin   = (net − cogs) / net   (cogs is optional; omit to skip)
 *
 * Inputs are kept Prisma-shape-agnostic so this module can be unit-
 * tested without spinning up a database.
 */

export type CountedOrderStatus =
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "refunded";

export interface DispensaryOrderInput {
  id: string;
  status: CountedOrderStatus | string;
  total: number;
  tax: number;
  createdAt: Date;
  items: {
    productId: string;
    quantity: number;
    totalPrice: number;
  }[];
}

export interface DispensaryProductInput {
  id: string;
  name: string;
  brand: string;
  format: string;
  price: number;
  inventoryCount: number;
  /** Optional unit cost used to compute gross margin. When absent, the
   * margin column on the SKU row is hidden rather than guessed. */
  unitCostCents?: number;
}

export interface SkuRollup {
  productId: string;
  name: string;
  brand: string;
  format: string;
  unitsSold: number;
  grossCents: number;
  refundedCents: number;
  netCents: number;
  /** Net margin pct in [0,100]; null when unitCost is unknown. */
  marginPct: number | null;
  inventoryOnHand: number;
  inventoryValueCents: number;
}

export interface DispensaryRevenueSummary {
  ordersCounted: number;
  unitsSold: number;
  grossCents: number;
  refundedCents: number;
  taxCents: number;
  netCents: number;
  inventoryUnits: number;
  inventoryValueCents: number;
  /** Skus ranked by net revenue, highest first. */
  topSkus: SkuRollup[];
}

const COUNTED_STATUSES: ReadonlySet<string> = new Set([
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "refunded",
]);

const REFUNDED_STATUSES: ReadonlySet<string> = new Set(["refunded"]);

/** Convert a dollar number (Float in Prisma) to integer cents. */
function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Compute the dispensary revenue rollup from raw orders + product
 * snapshot. Mutates nothing; safe to call repeatedly.
 */
export function computeDispensaryRevenue(
  orders: DispensaryOrderInput[],
  products: DispensaryProductInput[]
): DispensaryRevenueSummary {
  const productById = new Map(products.map((p) => [p.id, p]));

  const skuMap = new Map<
    string,
    {
      unitsSold: number;
      grossCents: number;
      refundedCents: number;
      cogsCents: number;
      hasCogs: boolean;
    }
  >();

  let ordersCounted = 0;
  let grossCents = 0;
  let refundedCents = 0;
  let taxCents = 0;

  for (const order of orders) {
    if (!COUNTED_STATUSES.has(order.status)) continue;
    ordersCounted++;

    const isRefund = REFUNDED_STATUSES.has(order.status);
    taxCents += toCents(order.tax);

    for (const item of order.items) {
      const lineCents = toCents(item.totalPrice);
      const product = productById.get(item.productId);
      const cogsCents = product?.unitCostCents
        ? product.unitCostCents * item.quantity
        : 0;
      const hasCogs = product?.unitCostCents !== undefined;

      const sku = skuMap.get(item.productId) ?? {
        unitsSold: 0,
        grossCents: 0,
        refundedCents: 0,
        cogsCents: 0,
        hasCogs,
      };

      if (isRefund) {
        refundedCents += lineCents;
        sku.refundedCents += lineCents;
        // Refunded units come back into inventory conceptually; they
        // don't contribute to "units sold" on the SKU rollup.
      } else {
        grossCents += lineCents;
        sku.grossCents += lineCents;
        sku.unitsSold += item.quantity;
        sku.cogsCents += cogsCents;
      }
      // Once we've seen any line for this SKU with a cogs value, hold
      // onto the flag — partial cogs coverage shows margin if at least
      // some lines have it.
      sku.hasCogs = sku.hasCogs || hasCogs;

      skuMap.set(item.productId, sku);
    }
  }

  const netCents = grossCents - refundedCents - taxCents;

  let inventoryUnits = 0;
  let inventoryValueCents = 0;
  for (const product of products) {
    inventoryUnits += product.inventoryCount;
    inventoryValueCents +=
      product.inventoryCount *
      (product.unitCostCents ?? toCents(product.price));
  }

  const topSkus: SkuRollup[] = [];
  for (const [productId, sku] of skuMap) {
    const product = productById.get(productId);
    if (!product) continue;
    const skuNet = sku.grossCents - sku.refundedCents;
    const marginPct =
      sku.hasCogs && skuNet > 0
        ? Math.round(((skuNet - sku.cogsCents) / skuNet) * 100)
        : null;
    topSkus.push({
      productId,
      name: product.name,
      brand: product.brand,
      format: product.format,
      unitsSold: sku.unitsSold,
      grossCents: sku.grossCents,
      refundedCents: sku.refundedCents,
      netCents: skuNet,
      marginPct,
      inventoryOnHand: product.inventoryCount,
      inventoryValueCents:
        product.inventoryCount *
        (product.unitCostCents ?? toCents(product.price)),
    });
  }
  topSkus.sort((a, b) => b.netCents - a.netCents);

  return {
    ordersCounted,
    unitsSold: topSkus.reduce((a, s) => a + s.unitsSold, 0),
    grossCents,
    refundedCents,
    taxCents,
    netCents,
    inventoryUnits,
    inventoryValueCents,
    topSkus: topSkus.slice(0, 8),
  };
}

/** Format an integer cents value as a short USD string ("$1.2k"). */
export function formatRevenue(cents: number): string {
  const dollars = cents / 100;
  if (Math.abs(dollars) >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return `$${dollars.toFixed(0)}`;
}
