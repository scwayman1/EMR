import Link from "next/link";
import type { Metadata } from "next";
import { AccountSidebar } from "@/components/leafmart/AccountSidebar";
import { AccountStatCard } from "@/components/leafmart/AccountStatCard";
import { AccountStatusBadge } from "@/components/leafmart/AccountStatusBadge";
import {
  DEMO_ORDERS,
  DEMO_OUTCOMES,
  formatDate,
  uniqueOrderedProductSlugs,
  type OrderStatus,
} from "@/components/leafmart/AccountData";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrdersByUser, formatOrderNumber } from "@/lib/leafmart/orders";

export const metadata: Metadata = {
  title: "Your account",
  description: "Your Leafmart orders, outcomes, and clinician connection.",
};

export const dynamic = "force-dynamic";

export default async function AccountDashboardPage() {
  const user = await getCurrentUser().catch(() => null);

  type RecentOrder = {
    id: string;
    number: string;
    date: string;
    total: number;
    status: OrderStatus;
    itemNames: string[];
  };

  let userName = "there";
  let ordersCount = DEMO_ORDERS.length;
  let productsTried = uniqueOrderedProductSlugs(DEMO_ORDERS).length;
  let outcomesLogged = DEMO_OUTCOMES.length;
  let recentOrders: RecentOrder[] = [...DEMO_ORDERS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3)
    .map((o) => ({
      id: o.id,
      number: o.id,
      date: o.date,
      total: o.total,
      status: o.status,
      itemNames: o.items.map((it) => it.name),
    }));

  if (user) {
    userName = user.firstName || user.email.split("@")[0] || "there";
    try {
      const real = await getOrdersByUser(user.id);
      const slugs = new Set<string>();
      for (const o of real) for (const it of o.items) slugs.add(it.product.slug);
      ordersCount = real.length;
      productsTried = slugs.size;
      // Outcomes are still demo until OutcomeLog wiring lands.
      recentOrders = real.slice(0, 3).map((o) => ({
        id: o.id,
        number: formatOrderNumber(o.id),
        date: o.createdAt.toISOString().slice(0, 10),
        total: o.total,
        status: (o.status as OrderStatus) ?? "processing",
        itemNames: o.items.map((it) => it.product.name),
      }));
    } catch {
      // DB unreachable — keep demo numbers.
    }
  }

  return (
    <section className="px-6 lg:px-14 pt-10 pb-20 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="mb-10">
        <p className="eyebrow text-[var(--muted)] mb-3">Your account</p>
        <h1 className="font-display text-[40px] sm:text-[56px] font-normal tracking-[-1.5px] leading-[1.05] text-[var(--ink)]">
          Welcome back,{" "}
          <em className="font-accent not-italic text-[var(--leaf)]">{userName}.</em>
        </h1>
        <p className="text-[17px] text-[var(--text-soft)] max-w-[560px] mt-4 leading-relaxed">
          Pick up where you left off — recent orders, outcomes you&rsquo;ve logged,
          and your link to the Leafjourney clinical desk.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        <aside>
          <AccountSidebar />
        </aside>

        <div className="space-y-12">
          {/* Stats */}
          <div>
            <p className="eyebrow text-[var(--muted)] mb-4">At a glance</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <AccountStatCard label="Orders placed" value={ordersCount} bg="var(--sage)" deep="var(--leaf)" />
              <AccountStatCard label="Products tried" value={productsTried} bg="var(--peach)" deep="#9E5621" />
              <AccountStatCard label="Outcomes logged" value={outcomesLogged} bg="var(--butter)" deep="#8A6A1F" />
            </div>
          </div>

          {/* Recent orders */}
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <p className="eyebrow text-[var(--muted)]">Recent orders</p>
              <Link
                href="/leafmart/account/orders"
                className="text-[13px] font-medium text-[var(--leaf)] hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              {recentOrders.length === 0 && (
                <div className="px-6 py-10 text-center text-[14px] text-[var(--text-soft)]">
                  No orders yet — your first one will land here.
                </div>
              )}
              {recentOrders.map((order, i) => (
                <Link
                  key={order.id}
                  href={user ? `/leafmart/account/orders/${order.id}` : `/leafmart/account/orders`}
                  className="card-lift block px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 hover:bg-[var(--bg-deep)]"
                  style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-mono text-[13px] text-[var(--ink)]">{order.number}</p>
                      <AccountStatusBadge status={order.status} />
                    </div>
                    <p className="text-[14px] text-[var(--text-soft)] truncate">
                      {order.itemNames.join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10">
                    <p className="text-[13px] text-[var(--muted)]">{formatDate(order.date)}</p>
                    <p className="font-display text-[20px] text-[var(--ink)]">${order.total.toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Connect to Leafjourney CTA */}
          <div
            className="rounded-[28px] p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center"
            style={{ background: "var(--sage)" }}
          >
            <div>
              <p className="eyebrow mb-3" style={{ color: "var(--leaf)" }}>
                Clinical bridge
              </p>
              <h2 className="font-display text-[28px] sm:text-[34px] font-normal tracking-[-0.8px] leading-[1.1] text-[var(--ink)] mb-3">
                Connect to Leafjourney for
                <em className="font-accent not-italic text-[var(--leaf)]"> personalized care.</em>
              </h2>
              <p className="text-[15px] text-[var(--text-soft)] max-w-[460px] leading-relaxed">
                Share your outcomes with a licensed clinician, get product
                recommendations tuned to your goals, and keep your full history
                in one place.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/leafmart/consult"
                className="inline-flex items-center justify-center rounded-full font-medium tracking-wide bg-[var(--leaf)] text-[var(--bg)] hover:bg-[var(--ink)] transition-colors"
                style={{ padding: "14px 28px", fontSize: 15 }}
              >
                Connect to Leafjourney
              </Link>
              <Link
                href="/leafmart/consult"
                className="text-center text-[13px] text-[var(--leaf)] hover:underline"
              >
                Learn how it works
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
