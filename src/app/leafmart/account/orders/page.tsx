import Link from "next/link";
import type { Metadata } from "next";
import { ProductSilhouette } from "@/components/leafmart/ProductSilhouette";
import { DEMO_PRODUCTS } from "@/components/leafmart/demo-data";
import { AccountSidebar } from "@/components/leafmart/AccountSidebar";
import { AccountStatusBadge } from "@/components/leafmart/AccountStatusBadge";
import {
  DEMO_ORDERS,
  formatDate,
  type Order as DemoOrder,
  type OrderStatus as DemoStatus,
} from "@/components/leafmart/AccountData";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrdersByUser, formatOrderNumber } from "@/lib/leafmart/orders";

export const metadata: Metadata = {
  title: "Order history",
  description: "Every Leafmart order you've placed.",
};

export const dynamic = "force-dynamic";

interface DisplayOrder {
  id: string;
  number: string;
  date: string;
  total: number;
  status: DemoStatus;
  items: Array<{
    slug: string;
    name: string;
    quantity: number;
    lineTotal: number;
  }>;
}

function demoOrderToDisplay(o: DemoOrder): DisplayOrder {
  return {
    id: o.id,
    number: o.id,
    date: o.date,
    total: o.total,
    status: o.status,
    items: o.items.map((it) => ({
      slug: it.slug,
      name: it.name,
      quantity: it.qty,
      lineTotal: it.price * it.qty,
    })),
  };
}

export default async function OrderHistoryPage() {
  const user = await getCurrentUser().catch(() => null);

  let orders: DisplayOrder[] = [];
  let usingDemoData = true;

  if (user) {
    try {
      const real = await getOrdersByUser(user.id);
      usingDemoData = false;
      orders = real.map((o) => ({
        id: o.id,
        number: formatOrderNumber(o.id),
        date: o.createdAt.toISOString().slice(0, 10),
        total: o.total,
        status: (o.status as DemoStatus) ?? "processing",
        items: o.items.map((it) => ({
          slug: it.product.slug,
          name: it.product.name,
          quantity: it.quantity,
          lineTotal: it.totalPrice,
        })),
      }));
    } catch {
      // DB unreachable — fall through to demo so the page still renders.
    }
  }

  if (usingDemoData) {
    orders = [...DEMO_ORDERS]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(demoOrderToDisplay);
  }

  return (
    <section className="px-6 lg:px-14 pt-10 pb-20 max-w-[1440px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-6">
        <Link href="/leafmart" className="hover:text-[var(--leaf)]">Leafmart</Link>
        <span>·</span>
        <Link href="/leafmart/account" className="hover:text-[var(--leaf)]">Account</Link>
        <span>·</span>
        <span className="text-[var(--text)]">Orders</span>
      </div>

      <div className="mb-10">
        <p className="eyebrow text-[var(--muted)] mb-3">Order history</p>
        <h1 className="font-display text-[40px] sm:text-[52px] font-normal tracking-[-1.5px] leading-[1.05] text-[var(--ink)]">
          Every order, in
          <em className="font-accent not-italic text-[var(--leaf)]"> one place.</em>
        </h1>
        {usingDemoData && (
          <p className="text-[13px] text-[var(--muted)] mt-3">
            Sample orders shown — sign in to see your own.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        <aside>
          <AccountSidebar />
        </aside>

        <div className="space-y-5">
          {orders.length === 0 && (
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
              <p className="font-display text-[24px] text-[var(--ink)] mb-2">
                No orders yet.
              </p>
              <p className="text-[14px] text-[var(--text-soft)] mb-6">
                Your past Leafmart orders will appear here once you check out.
              </p>
              <Link
                href="/leafmart/shop"
                className="inline-flex items-center rounded-full bg-[var(--ink)] text-[#FFF8E8] px-6 py-3 text-[14px] font-medium hover:bg-[var(--leaf)] transition-colors"
              >
                Browse the shop
              </Link>
            </div>
          )}

          {orders.map((order) => {
            const detailHref = usingDemoData
              ? "#"
              : `/leafmart/account/orders/${order.id}`;
            return (
              <article
                key={order.id}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 lg:p-8"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-5 border-b border-[var(--border)]">
                  <div className="flex flex-wrap items-center gap-4">
                    <p className="font-mono text-[13px] text-[var(--ink)]">{order.number}</p>
                    <p className="text-[13px] text-[var(--muted)]">{formatDate(order.date)}</p>
                    <AccountStatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="eyebrow text-[var(--muted)]">Total</p>
                    <p className="font-display text-[24px] text-[var(--ink)]">${order.total.toFixed(2)}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3 mb-6">
                  {order.items.map((it) => {
                    const product = DEMO_PRODUCTS.find((p) => p.slug === it.slug);
                    return (
                      <Link
                        key={it.slug}
                        href={`/leafmart/products/${it.slug}`}
                        className="card-lift flex items-center gap-4 p-3 rounded-[16px] hover:bg-[var(--bg-deep)]"
                      >
                        <div className="w-[72px] h-[72px] rounded-[14px] overflow-hidden flex-shrink-0">
                          {product ? (
                            <ProductSilhouette
                              shape={product.shape}
                              bg={product.bg}
                              deep={product.deep}
                              height={72}
                            />
                          ) : (
                            <div className="w-full h-full" style={{ background: "var(--bg-deep)" }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] text-[var(--ink)] font-medium truncate">{it.name}</p>
                          <p className="text-[13px] text-[var(--muted)]">Qty {it.quantity}</p>
                        </div>
                        <p className="font-mono text-[13px] text-[var(--text)]">${it.lineTotal.toFixed(2)}</p>
                      </Link>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full font-medium border-[1.5px] border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[#FFF8E8] transition-colors"
                    style={{ padding: "10px 20px", fontSize: 13.5 }}
                  >
                    Reorder
                  </button>
                  <Link
                    href={detailHref}
                    className="inline-flex items-center rounded-full font-medium text-[var(--leaf)] hover:underline"
                    style={{ padding: "10px 14px", fontSize: 13.5 }}
                  >
                    View details →
                  </Link>
                  <Link
                    href="/leafmart/account/outcomes"
                    className="inline-flex items-center rounded-full font-medium text-[var(--text-soft)] hover:text-[var(--leaf)]"
                    style={{ padding: "10px 14px", fontSize: 13.5 }}
                  >
                    Log an outcome →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
