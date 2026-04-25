import Link from "next/link";
import type { Metadata } from "next";
import { ProductSilhouette } from "@/components/leafmart/ProductSilhouette";
import { DEMO_PRODUCTS } from "@/components/leafmart/demo-data";
import { AccountSidebar } from "@/components/leafmart/AccountSidebar";
import { AccountStatusBadge } from "@/components/leafmart/AccountStatusBadge";
import { DEMO_ORDERS, formatDate } from "@/components/leafmart/AccountData";

export const metadata: Metadata = {
  title: "Order history",
  description: "Every Leafmart order you've placed.",
};

export default function OrderHistoryPage() {
  const orders = [...DEMO_ORDERS].sort((a, b) => b.date.localeCompare(a.date));

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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        <aside>
          <AccountSidebar />
        </aside>

        <div className="space-y-5">
          {orders.map((order) => {
            const detailHref = `/leafmart/account/orders#${order.id}`;
            return (
              <article
                id={order.id}
                key={order.id}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 lg:p-8"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-5 border-b border-[var(--border)]">
                  <div className="flex flex-wrap items-center gap-4">
                    <p className="font-mono text-[13px] text-[var(--ink)]">{order.id}</p>
                    <p className="text-[13px] text-[var(--muted)]">{formatDate(order.date)}</p>
                    <AccountStatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="eyebrow text-[var(--muted)]">Total</p>
                    <p className="font-display text-[24px] text-[var(--ink)]">${order.total}</p>
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
                          <p className="text-[13px] text-[var(--muted)]">Qty {it.qty}</p>
                        </div>
                        <p className="font-mono text-[13px] text-[var(--text)]">${it.price * it.qty}</p>
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
