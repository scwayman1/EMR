"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { lex } from "@/lib/lexicon";
import type { TroveTierKey } from "@/lib/lexicon";
import { centsToDollars } from "@/lib/domain/seed-trove-loyalty";

export interface ProgramStats {
  activeMembers: number;
  membersByTier: Record<TroveTierKey, number>;
  seedsOutstanding: number;
  seedsEarnedLast30: number;
  seedsRedeemedLast30: number;
  fruitCardsIssuedLast30: number;
  fruitCardsRedeemedLast30: number;
  /** Fruit card unredeemed value — accounting liability. */
  fruitCardLiabilityCents: number;
  donationToFundLast30Cents: number;
  topEarnSources: Array<{ label: string; seeds: number }>;
}

interface Tier {
  key: TroveTierKey;
  label: string;
  minSeeds: number;
  hue: string;
}

export function ProgramView({ stats, tiers }: { stats: ProgramStats; tiers: Tier[] }) {
  const totalMembers = stats.activeMembers || 1;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiTile label="Active members" value={stats.activeMembers.toLocaleString()} />
        <KpiTile
          label={`${lex("currency.points")} outstanding`}
          value={stats.seedsOutstanding.toLocaleString()}
          hint="Total balance across all members"
        />
        <KpiTile
          label="30d earn velocity"
          value={`+${stats.seedsEarnedLast30.toLocaleString()}`}
        />
        <KpiTile
          label="30d redeem velocity"
          value={`-${stats.seedsRedeemedLast30.toLocaleString()}`}
        />
        <KpiTile
          label={`${lex("noun.giftCard")} liability`}
          value={centsToDollars(stats.fruitCardLiabilityCents)}
          hint="Unredeemed face value"
        />
        <KpiTile
          label={`${lex("noun.giftCard")}s issued (30d)`}
          value={stats.fruitCardsIssuedLast30.toLocaleString()}
        />
        <KpiTile
          label={`${lex("noun.giftCard")}s redeemed (30d)`}
          value={stats.fruitCardsRedeemedLast30.toLocaleString()}
        />
        <KpiTile
          label="Gifted to fund (30d)"
          value={centsToDollars(stats.donationToFundLast30Cents)}
          hint="Member gifts → Charitable Fund"
        />
      </div>

      <Card>
        <CardContent className="py-6">
          <p className="text-xs uppercase tracking-wider text-text-subtle mb-4">Members by {lex("noun.tier").toLowerCase()}</p>
          <div className="space-y-2">
            {tiers.map((t) => {
              const n = stats.membersByTier[t.key] ?? 0;
              const pct = (n / totalMembers) * 100;
              return (
                <div key={t.key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text">{t.label}</span>
                    <span className="text-text-subtle tabular-nums">
                      {n.toLocaleString()} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 mt-1 rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, background: t.hue }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-6">
          <p className="text-xs uppercase tracking-wider text-text-subtle mb-4">Top earn sources (30d)</p>
          <ul className="space-y-2">
            {stats.topEarnSources.map((s) => {
              const pct = (s.seeds / stats.seedsEarnedLast30) * 100;
              return (
                <li key={s.label} className="flex items-center gap-3">
                  <span className="text-sm text-text w-44 shrink-0">{s.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-text-subtle tabular-nums w-28 text-right">
                    {s.seeds.toLocaleString()} <Badge tone="neutral">{pct.toFixed(0)}%</Badge>
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-[11px] uppercase tracking-wider text-text-subtle">{label}</p>
        <p className="font-display text-2xl text-text mt-1 tabular-nums">{value}</p>
        {hint && <p className="text-[11px] text-text-subtle mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}
