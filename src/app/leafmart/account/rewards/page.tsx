// EMR-313 — Loyalty / rewards page.
//
// Pulls the customer's loyalty account and renders the balance, tier
// progress, redemption catalog, and the points ledger. The page falls
// back to a demo account when no user is signed in so the design can
// be reviewed without a live session.

import type { Metadata } from "next";
import { AccountSidebar } from "@/components/leafmart/AccountSidebar";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDate } from "@/components/leafmart/AccountData";
import {
  DEMO_ACCOUNT,
  REWARD_CATALOG,
  TIERS,
  computeBalance,
  deriveTier,
  progressToNextTier,
  type LoyaltyAccount,
  type RewardOption,
} from "@/lib/leafmart/loyalty";

export const metadata: Metadata = {
  title: "Rewards",
  description: "Earn points with every order and turn them into credit, perks, or clinician time.",
};

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const user = await getCurrentUser().catch(() => null);
  // Until the loyalty store ships, render the demo account so the page
  // is always presentable. Once persisted, swap in `getLoyaltyAccount(user.id)`.
  const account: LoyaltyAccount = DEMO_ACCOUNT;
  const balance = computeBalance(account);
  const tier = deriveTier(account.trailing12mSpend);
  const progress = progressToNextTier(account);
  const userName = user?.firstName || user?.email?.split("@")[0] || "there";

  const earnable = REWARD_CATALOG.filter((r) => r.cost <= balance);
  const aspirational = REWARD_CATALOG.filter((r) => r.cost > balance);

  return (
    <section className="px-6 lg:px-14 pt-10 pb-20 max-w-[1440px] mx-auto">
      <div className="mb-10">
        <p className="eyebrow text-[var(--muted)] mb-3">Rewards</p>
        <h1 className="font-display text-[40px] sm:text-[56px] font-normal tracking-[-1.5px] leading-[1.05] text-[var(--ink)]">
          Thanks for showing up,{" "}
          <em className="font-accent not-italic text-[var(--leaf)]">{userName}.</em>
        </h1>
        <p className="text-[17px] text-[var(--text-soft)] max-w-[560px] mt-4 leading-relaxed">
          Every order, review, and outcome you log earns points — and the points
          are good for store credit, clinician time, or a donation to our
          research fund.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        <aside>
          <AccountSidebar />
        </aside>

        <div className="space-y-12">
          {/* Balance + tier */}
          <div
            className="rounded-[28px] p-8 lg:p-10 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6 items-end"
            style={{ background: tier.accent }}
          >
            <div>
              <p className="eyebrow text-[var(--ink)] mb-2 opacity-80">Your tier</p>
              <h2 className="font-display text-[34px] sm:text-[44px] font-medium tracking-[-1px] leading-[1] text-[var(--ink)]">
                {tier.label}
              </h2>
              {progress.next ? (
                <>
                  <div className="mt-5 h-[8px] rounded-full bg-[var(--ink)]/15 overflow-hidden max-w-[400px]">
                    <div
                      className="h-full bg-[var(--ink)] transition-[width] duration-700"
                      style={{ width: `${progress.fraction * 100}%` }}
                    />
                  </div>
                  <p className="text-[13px] text-[var(--ink)]/75 mt-2">
                    ${progress.spendNeeded.toFixed(0)} more spend in the next 12
                    months unlocks{" "}
                    <span className="font-medium text-[var(--ink)]">
                      {progress.next.label}
                    </span>{" "}
                    · {progress.next.multiplier}× points.
                  </p>
                </>
              ) : (
                <p className="text-[13px] text-[var(--ink)]/75 mt-3">
                  You're at the top tier — thanks for being part of the grove.
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[12px] text-[var(--ink)]/70 mb-1">Available points</p>
              <p className="font-display text-[44px] sm:text-[56px] tabular-nums font-medium leading-none text-[var(--ink)]">
                {balance.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Tier ladder */}
          <div>
            <p className="eyebrow text-[var(--muted)] mb-4">Tier ladder</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {TIERS.map((t) => {
                const active = t.id === tier.id;
                return (
                  <div
                    key={t.id}
                    className={`rounded-[20px] p-5 border ${
                      active
                        ? "border-[var(--leaf)] bg-[var(--surface)]"
                        : "border-[var(--border)] bg-[var(--surface)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: t.accent }}
                        aria-hidden="true"
                      />
                      <p
                        className={`font-display text-[18px] tracking-tight ${
                          active ? "text-[var(--ink)]" : "text-[var(--text)]"
                        }`}
                      >
                        {t.label}
                      </p>
                      {active && (
                        <span className="ml-auto text-[10.5px] uppercase tracking-wider text-[var(--leaf)] font-semibold">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[var(--muted)] mb-3">
                      ${t.minSpend.toLocaleString()}+ trailing 12mo · {t.multiplier}× points
                    </p>
                    <ul className="space-y-1.5 text-[12.5px] text-[var(--text-soft)] leading-relaxed">
                      {t.perks.map((p) => (
                        <li key={p} className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-[var(--leaf)] shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Redeem catalog */}
          <div>
            <p className="eyebrow text-[var(--muted)] mb-4">Redeem your points</p>
            {earnable.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {earnable.map((r) => (
                  <RewardCard key={r.id} reward={r} balance={balance} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-[13px] text-[var(--muted)] mb-6">
                Earn a few more points and redemptions will unlock here.
              </div>
            )}

            {aspirational.length > 0 && (
              <>
                <p className="text-[12px] text-[var(--muted)] mb-3">Coming soon as you earn</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-70">
                  {aspirational.map((r) => (
                    <RewardCard key={r.id} reward={r} balance={balance} disabled />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Ledger */}
          <div>
            <p className="eyebrow text-[var(--muted)] mb-4">Points history</p>
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              {account.ledger.length === 0 ? (
                <div className="px-6 py-8 text-center text-[13.5px] text-[var(--muted)]">
                  No points activity yet.
                </div>
              ) : (
                account.ledger.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="px-6 py-4 flex items-center justify-between gap-4"
                    style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
                  >
                    <div>
                      <p className="text-[13.5px] text-[var(--text)]">
                        {entry.description}
                      </p>
                      <p className="text-[11.5px] text-[var(--muted)] mt-0.5 tabular-nums">
                        {formatDate(entry.createdAt)}
                      </p>
                    </div>
                    <p
                      className={`font-display text-[18px] tabular-nums ${
                        entry.delta >= 0 ? "text-[var(--leaf)]" : "text-[var(--muted)]"
                      }`}
                    >
                      {entry.delta >= 0 ? "+" : ""}
                      {entry.delta.toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RewardCard({
  reward,
  balance,
  disabled,
}: {
  reward: RewardOption;
  balance: number;
  disabled?: boolean;
}) {
  const affordable = !disabled && balance >= reward.cost;
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col">
      <p className="font-display text-[18px] text-[var(--ink)] mb-1">{reward.label}</p>
      <p className="text-[12.5px] text-[var(--text-soft)] flex-1 leading-relaxed">
        {reward.description}
      </p>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
        <p className="text-[12px] text-[var(--muted)] tabular-nums">
          {reward.cost.toLocaleString()} pts
        </p>
        <button
          type="button"
          disabled={!affordable}
          className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
            affordable
              ? "bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--leaf)]"
              : "bg-[var(--border)] text-[var(--muted)] cursor-not-allowed"
          }`}
        >
          {affordable ? "Redeem" : "Locked"}
        </button>
      </div>
    </div>
  );
}

