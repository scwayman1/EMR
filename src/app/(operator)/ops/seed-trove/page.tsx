import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { lex } from "@/lib/lexicon";
import { TROVE_TIERS } from "@/lib/lexicon";
import { ProgramView, type ProgramStats } from "./program-view";

export const metadata = { title: "Seed Trove · Operator" };

// Operator-side view of the loyalty program. Until persistence ships, the
// numbers here are illustrative cohorts so the dashboard reads like a real
// program — not a placeholder. Pure data; the view component handles UI.
const DEMO_STATS: ProgramStats = {
  activeMembers: 1284,
  membersByTier: {
    sprout: 612,
    sapling: 401,
    canopy: 218,
    "old-growth": 53,
  },
  seedsOutstanding: 4_812_000,
  seedsEarnedLast30: 920_500,
  seedsRedeemedLast30: 412_300,
  fruitCardsIssuedLast30: 187,
  fruitCardsRedeemedLast30: 142,
  fruitCardLiabilityCents: 1_842_500, // $18,425.00
  donationToFundLast30Cents: 218_000,
  topEarnSources: [
    { label: "Marketplace purchase", seeds: 412_000 },
    { label: "Weekly survey", seeds: 192_500 },
    { label: "Volunteer hour", seeds: 142_000 },
    { label: "Dose check-in", seeds: 89_000 },
    { label: "Referral", seeds: 85_000 },
  ],
};

export default async function OpsSeedTrovePage() {
  await requireUser();
  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Loyalty"
        title={`${lex("trove.name")} program`}
        description={`Member health, ${lex("currency.points").toLowerCase()} velocity, and ${lex("noun.giftCard").toLowerCase()} liability for the loyalty surface.`}
      />
      <ProgramView stats={DEMO_STATS} tiers={[...TROVE_TIERS]} />
      <p className="mt-8 text-xs text-text-subtle">
        Numbers shown reflect demo cohorts. Wire to <code>SeedLedgerEntry</code> + <code>GiftCard</code> persistence when the
        Track 6 schema lands.
      </p>
      <TierLegend tiers={[...TROVE_TIERS]} />
    </PageShell>
  );
}

function TierLegend({ tiers }: { tiers: typeof TROVE_TIERS extends ReadonlyArray<infer T> ? T[] : never }) {
  return (
    <Card className="mt-4">
      <CardContent className="py-5">
        <p className="text-xs uppercase tracking-wider text-text-subtle mb-3">{lex("noun.tier")}s</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tiers.map((t) => (
            <div key={t.key} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: t.hue }} />
              <div>
                <p className="text-sm text-text">{t.label}</p>
                <p className="text-[11px] text-text-subtle">{t.minSeeds.toLocaleString()}+ {lex("currency.points").toLowerCase()}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
