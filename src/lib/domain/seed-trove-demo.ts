// Demo data factory for the Seed Trove surfaces. Mirrors the pattern used
// by other Track 6 features (community, feedback, garden) where pages
// render against deterministic seed data until the persistence layer lands.
//
// Using a userId as the seed input keeps cards stable per-session per-user
// across navigation; a refresh shows the same trove, not a re-shuffled one.

import {
  type SeedLedgerEntry,
  type GiftCard,
  type SeedTroveSnapshot,
  snapshotFromLedger,
} from "./seed-trove-loyalty";

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seedStr: string): () => number {
  let s = hash(seedStr);
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function buildDemoLedger(userId: string): SeedLedgerEntry[] {
  const r = rng(userId + "-ledger");
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const entries: SeedLedgerEntry[] = [];

  // 8 weeks of varied activity, weighted toward earn so balance is positive.
  const sources: Array<SeedLedgerEntry["source"]> = [
    "dose_log",
    "dose_log",
    "weekly_checkin",
    "volunteer_hour",
    "purchase",
    "milestone",
    "referral",
  ];
  for (let week = 0; week < 8; week++) {
    const eventsThisWeek = 3 + Math.floor(r() * 3);
    for (let i = 0; i < eventsThisWeek; i++) {
      const src = sources[Math.floor(r() * sources.length)]!;
      const delta =
        src === "dose_log"
          ? 5
          : src === "weekly_checkin"
            ? 25
            : src === "volunteer_hour"
              ? 50
              : src === "purchase"
                ? 8 + Math.floor(r() * 30)
                : src === "milestone"
                  ? 500
                  : 250;
      const memo =
        src === "dose_log"
          ? "Logged a check-in"
          : src === "weekly_checkin"
            ? "Weekly outcome survey"
            : src === "volunteer_hour"
              ? "Volunteer hour confirmed"
              : src === "purchase"
                ? `Marketplace purchase`
                : src === "milestone"
                  ? "30-day Bloom milestone"
                  : "Referred a new patient";
      entries.push({
        id: `seed-${week}-${i}-${userId.slice(-4)}`,
        userId,
        kind: "earn",
        delta,
        source: src,
        memo,
        occurredAt: new Date(now - week * 7 * day - Math.floor(r() * day)).toISOString(),
      });
    }
  }

  // A couple of redemptions for realism.
  entries.push({
    id: `redeem-1-${userId.slice(-4)}`,
    userId,
    kind: "redeem",
    delta: -1000,
    redemption: "gift_card",
    memo: "Traded for a $10 fruit card",
    occurredAt: new Date(now - 18 * day).toISOString(),
  });
  entries.push({
    id: `redeem-2-${userId.slice(-4)}`,
    userId,
    kind: "redeem",
    delta: -250,
    redemption: "charity_donation",
    memo: "Gifted to Leafjourney Charitable Fund",
    occurredAt: new Date(now - 4 * day).toISOString(),
  });

  return entries;
}

export function buildDemoSnapshot(userId: string): SeedTroveSnapshot {
  return snapshotFromLedger(userId, buildDemoLedger(userId));
}

export function buildDemoGiftCards(userId: string): GiftCard[] {
  const r = rng(userId + "-cards");
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const issued = new Date(now - 18 * day).toISOString();
  const expires = new Date(now + 347 * day).toISOString();
  return [
    {
      id: `gc-${Math.floor(r() * 1e9).toString(36)}`,
      code: "FRUT-XJ4P-9KAH-LMQ7",
      faceValueCents: 1000,
      remainingCents: 600,
      status: "partially_redeemed",
      issuedByUserId: userId,
      issuedAt: issued,
      expiresAt: expires,
      fundedBy: "seeds",
      seedsBurned: 1000,
    },
    {
      id: `gc-${Math.floor(r() * 1e9).toString(36)}`,
      code: "FRUT-AB3K-MNDP-XR82",
      faceValueCents: 2500,
      remainingCents: 2500,
      status: "issued",
      recipientName: "Mom",
      recipientEmail: "mom@example.com",
      message: "Thanks for everything 💚",
      issuedByUserId: userId,
      issuedAt: new Date(now - 3 * day).toISOString(),
      expiresAt: new Date(now + 362 * day).toISOString(),
      fundedBy: "cash",
    },
  ];
}
