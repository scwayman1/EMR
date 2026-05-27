import { DEMO_PRODUCTS } from "@/components/leafmart/demo-data";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderItem {
  slug: string;
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  date: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
}

const p = (slug: string) => DEMO_PRODUCTS.find((x) => x.slug === slug)!;

export const DEMO_ORDERS: Order[] = [
  {
    id: "LM-10238",
    date: "2026-04-12",
    items: [
      { slug: "stillwater-sleep-tonic", name: p("stillwater-sleep-tonic").name, qty: 2, price: 32 },
      { slug: "quiet-hours-tincture", name: p("quiet-hours-tincture").name, qty: 1, price: 64 },
    ],
    total: 128,
    status: "delivered",
  },
  {
    id: "LM-10184",
    date: "2026-03-28",
    items: [
      { slug: "field-balm-no-4", name: p("field-balm-no-4").name, qty: 1, price: 48 },
    ],
    total: 48,
    status: "delivered",
  },
  {
    id: "LM-10142",
    date: "2026-03-09",
    items: [
      { slug: "gold-skin-serum", name: p("gold-skin-serum").name, qty: 1, price: 84 },
      { slug: "stillwater-sleep-tonic", name: p("stillwater-sleep-tonic").name, qty: 1, price: 32 },
    ],
    total: 116,
    status: "delivered",
  },
  {
    id: "LM-10298",
    date: "2026-04-22",
    items: [
      { slug: "field-balm-no-4", name: p("field-balm-no-4").name, qty: 2, price: 48 },
    ],
    total: 96,
    status: "shipped",
  },
];

export interface OutcomeEntry {
  id: string;
  productSlug: string;
  date: string;
  rating: number;
  note?: string;
}

export const DEMO_OUTCOMES: OutcomeEntry[] = [
  { id: "o-1", productSlug: "stillwater-sleep-tonic", date: "2026-04-20", rating: 5, note: "Out within 30 minutes. Slept through till 6." },
  { id: "o-2", productSlug: "quiet-hours-tincture", date: "2026-04-15", rating: 4, note: "Calm but not drowsy. Took the edge off." },
  { id: "o-3", productSlug: "field-balm-no-4", date: "2026-04-02", rating: 5 },
  { id: "o-4", productSlug: "stillwater-sleep-tonic", date: "2026-03-30", rating: 4, note: "Pleasant flavor, mild effect." },
];

export function uniqueOrderedProductSlugs(orders: Order[]): string[] {
  const set = new Set<string>();
  for (const o of orders) for (const it of o.items) set.add(it.slug);
  return [...set];
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const STATUS_BG: Record<OrderStatus, string> = {
  pending: "var(--bg-deep)",
  confirmed: "var(--leaf-soft)",
  processing: "var(--peach)",
  shipped: "var(--butter)",
  delivered: "var(--sage)",
  cancelled: "var(--rose)",
  refunded: "var(--lilac)",
};

export const STATUS_FG: Record<OrderStatus, string> = {
  pending: "var(--text-soft)",
  confirmed: "var(--leaf)",
  processing: "#9E5621",
  shipped: "#8A6A1F",
  delivered: "var(--leaf)",
  cancelled: "#9E4D45",
  refunded: "#5C4972",
};

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
