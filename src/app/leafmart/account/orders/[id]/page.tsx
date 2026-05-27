import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProductSilhouette } from "@/components/leafmart/ProductSilhouette";
import { DEMO_PRODUCTS } from "@/components/leafmart/demo-data";
import { AccountSidebar } from "@/components/leafmart/AccountSidebar";
import { AccountStatusBadge } from "@/components/leafmart/AccountStatusBadge";
import {
  formatDate,
  type OrderStatus,
} from "@/components/leafmart/AccountData";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getOrderByIdForUser,
  formatOrderNumber,
  type LeafmartShippingAddress,
} from "@/lib/leafmart/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order detail",
};

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    redirect(`/leafmart/login?next=/leafmart/account/orders/${params.id}`);
  }

  const order = await getOrderByIdForUser(params.id, user.id);
  if (!order) notFound();

  const status = (order.status as OrderStatus) ?? "processing";
  const number = formatOrderNumber(order.id);
  const address = (order.shippingAddress ?? {}) as unknown as LeafmartShippingAddress;

  return (
    <section className="px-6 lg:px-14 pt-10 pb-20 max-w-[1440px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-6">
        <Link href="/leafmart" className="hover:text-[var(--leaf)]">Leafmart</Link>
        <span>·</span>
        <Link href="/leafmart/account" className="hover:text-[var(--leaf)]">Account</Link>
        <span>·</span>
        <Link href="/leafmart/account/orders" className="hover:text-[var(--leaf)]">Orders</Link>
        <span>·</span>
        <span className="text-[var(--text)]">{number}</span>
      </div>

      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-[var(--muted)] mb-3">Order detail</p>
          <h1 className="font-display text-[40px] sm:text-[48px] font-normal tracking-[-1.5px] leading-[1.05] text-[var(--ink)]">
            <span className="font-mono text-[28px] sm:text-[32px] text-[var(--text-soft)]">{number}</span>
          </h1>
          <p className="text-[14px] text-[var(--muted)] mt-2">
            Placed {formatDate(order.createdAt.toISOString().slice(0, 10))}
          </p>
        </div>
        <AccountStatusBadge status={status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        <aside>
          <AccountSidebar />
        </aside>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
          {/* Items */}
          <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 lg:p-8">
            <p className="eyebrow text-[var(--muted)] mb-5">Items</p>
            <div className="space-y-3">
              {order.items.map((it) => {
                const demo = DEMO_PRODUCTS.find((p) => p.slug === it.product.slug);
                return (
                  <Link
                    key={it.id}
                    href={`/leafmart/products/${it.product.slug}`}
                    className="card-lift flex items-center gap-4 p-3 rounded-[16px] hover:bg-[var(--bg-deep)]"
                  >
                    <div className="w-12 h-12 rounded-[12px] overflow-hidden flex-shrink-0">
                      {demo ? (
                        <ProductSilhouette
                          shape={demo.shape}
                          bg={demo.bg}
                          deep={demo.deep}
                          height={48}
                        />
                      ) : (
                        <div className="w-full h-full" style={{ background: "var(--bg-deep)" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] text-[var(--ink)] font-medium truncate">
                        {it.product.name}
                      </p>
                      <p className="text-[12.5px] text-[var(--muted)]">Qty {it.quantity} · ${it.unitPrice.toFixed(2)} each</p>
                    </div>
                    <p className="font-mono text-[13px] text-[var(--text)]">${it.totalPrice.toFixed(2)}</p>
                  </Link>
                );
              })}
            </div>
          </article>

          {/* Summary + shipping */}
          <div className="space-y-6">
            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6">
              <p className="eyebrow text-[var(--muted)] mb-4">Summary</p>
              <dl className="space-y-2.5 text-[13.5px]">
                <div className="flex justify-between">
                  <dt className="text-[var(--text-soft)]">Subtotal</dt>
                  <dd className="text-[var(--ink)] font-medium tabular-nums">${order.subtotal.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-soft)]">Shipping</dt>
                  <dd className="text-[var(--leaf)] font-medium">Free</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-soft)]">Tax</dt>
                  <dd className="text-[var(--ink)] font-medium tabular-nums">${order.tax.toFixed(2)}</dd>
                </div>
              </dl>
              <div className="border-t border-[var(--border)] mt-4 pt-4 flex justify-between items-baseline">
                <span className="text-[14px] font-medium text-[var(--ink)]">Total</span>
                <span className="font-display text-[24px] font-medium text-[var(--ink)] tabular-nums">
                  ${order.total.toFixed(2)}
                </span>
              </div>
            </article>

            {address.address1 && (
              <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6">
                <p className="eyebrow text-[var(--muted)] mb-3">Shipping to</p>
                <p className="text-[14px] text-[var(--ink)] leading-relaxed">
                  {address.firstName} {address.lastName}<br />
                  {address.address1}{address.address2 ? `, ${address.address2}` : ""}<br />
                  {address.city}, {address.state} {address.zip}
                </p>
                {address.contactEmail && (
                  <p className="text-[12.5px] text-[var(--muted)] mt-3">{address.contactEmail}</p>
                )}
              </article>
            )}

            <div className="flex flex-col gap-2">
              <Link
                href="/leafmart/account/outcomes"
                className="inline-flex items-center justify-center rounded-full bg-[var(--leaf)] text-[var(--bg)] px-6 py-3 text-[14px] font-medium hover:bg-[var(--ink)] transition-colors"
              >
                Log an outcome
              </Link>
              <Link
                href="/leafmart/account/orders"
                className="inline-flex items-center justify-center rounded-full border-[1.5px] border-[var(--ink)] text-[var(--ink)] px-6 py-3 text-[14px] font-medium hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors"
              >
                Back to orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
