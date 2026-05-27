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

// EMR-183 — Inventory reorder alerts.
//
// `LOW_STOCK_THRESHOLD` and `CRITICAL_STOCK_THRESHOLD` are the org-wide
// defaults until each SKU carries its own par level. The cockpit lists
// any SKU at-or-below the threshold so purchasing has a single queue.

export const LOW_STOCK_THRESHOLD = 20;
export const CRITICAL_STOCK_THRESHOLD = 5;

export interface ReorderAlert {
  productId: string;
  name: string;
  brand: string;
  format: string;
  inventoryOnHand: number;
  /** "critical" when at or below the critical threshold; "low" otherwise. */
  severity: "critical" | "low";
}

export function buildReorderAlerts(
  products: DispensaryProductInput[],
): ReorderAlert[] {
  const alerts: ReorderAlert[] = [];
  for (const p of products) {
    if (p.inventoryCount > LOW_STOCK_THRESHOLD) continue;
    alerts.push({
      productId: p.id,
      name: p.name,
      brand: p.brand,
      format: p.format,
      inventoryOnHand: p.inventoryCount,
      severity:
        p.inventoryCount <= CRITICAL_STOCK_THRESHOLD ? "critical" : "low",
    });
  }
  // Sort criticals first, then by ascending stock so the most urgent is on top.
  alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return a.inventoryOnHand - b.inventoryOnHand;
  });
  return alerts;
}

// EMR-183 — Weekly gross/net time series.
//
// Splits the same orders the rollup uses into ISO-week buckets so the
// cockpit can sparkline trend over the look-back window without a
// second DB round-trip.

export interface RevenuePoint {
  weekStart: string;
  grossCents: number;
  refundedCents: number;
  taxCents: number;
  netCents: number;
}

function startOfIsoWeek(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const offset = (day + 6) % 7; // shift Sunday=0 → 6, Monday=1 → 0
  date.setUTCDate(date.getUTCDate() - offset);
  return date;
}

export function computeWeeklyRevenueSeries(
  orders: DispensaryOrderInput[],
): RevenuePoint[] {
  const buckets = new Map<string, RevenuePoint>();
  for (const o of orders) {
    if (!COUNTED_STATUSES.has(o.status)) continue;
    const key = startOfIsoWeek(o.createdAt).toISOString().slice(0, 10);
    const point = buckets.get(key) ?? {
      weekStart: key,
      grossCents: 0,
      refundedCents: 0,
      taxCents: 0,
      netCents: 0,
    };
    const isRefund = REFUNDED_STATUSES.has(o.status);
    point.taxCents += toCents(o.tax);
    for (const item of o.items) {
      const line = toCents(item.totalPrice);
      if (isRefund) point.refundedCents += line;
      else point.grossCents += line;
    }
    point.netCents = point.grossCents - point.refundedCents - point.taxCents;
    buckets.set(key, point);
  }
  return Array.from(buckets.values()).sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart),
  );
}
