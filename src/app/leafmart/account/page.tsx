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
} from "@/components/leafmart/AccountData";

export const metadata: Metadata = {
  title: "Your account",
  description: "Your Leafmart orders, outcomes, and clinician connection.",
};

const USER_NAME = "Maya";

export default function AccountDashboardPage() {
  const ordersCount = DEMO_ORDERS.length;
  const productsTried = uniqueOrderedProductSlugs(DEMO_ORDERS).length;
  const outcomesLogged = DEMO_OUTCOMES.length;
  const recentOrders = [...DEMO_ORDERS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  return (
    <section className="px-6 lg:px-14 pt-10 pb-20 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="mb-10">
        <p className="eyebrow text-[var(--muted)] mb-3">Your account</p>
        <h1 className="font-display text-[40px] sm:text-[56px] font-normal tracking-[-1.5px] leading-[1.05] text-[var(--ink)]">
          Welcome back,{" "}
          <em className="font-accent not-italic text-[var(--leaf)]">{USER_NAME}.</em>
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
              {recentOrders.map((order, i) => (
                <Link
                  key={order.id}
                  href={`/leafmart/account/orders`}
                  className="card-lift block px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 hover:bg-[var(--bg-deep)]"
                  style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-mono text-[13px] text-[var(--ink)]">{order.id}</p>
                      <AccountStatusBadge status={order.status} />
                    </div>
                    <p className="text-[14px] text-[var(--text-soft)] truncate">
                      {order.items.map((it) => it.name).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10">
                    <p className="text-[13px] text-[var(--muted)]">{formatDate(order.date)}</p>
                    <p className="font-display text-[20px] text-[var(--ink)]">${order.total}</p>
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
                className="inline-flex items-center justify-center rounded-full font-medium tracking-wide bg-[var(--leaf)] text-[#FFF8E8] hover:bg-[var(--ink)] transition-colors"
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
