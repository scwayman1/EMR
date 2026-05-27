// EMR-314 — Seed Trove lexicon.
//
// The platform's nurture-harvest-fruit metaphor unifies Track 6 surfaces
// (loyalty, volunteer hours, CME credits, charitable fund). One canonical
// place to look up a user-facing label so a copy review is a one-file edit.
//
// Metaphor:
//   seed     — an intention you plant (goal, pledge, point you've earned)
//   nurture  — the act of tending (logging, learning, volunteering, dosing)
//   harvest  — what your nurture yields (an unlocked reward, a credit, a milestone)
//   fruit    — the redeemable artifact (gift card, certificate, donation receipt)
//   trove    — the collection that holds it all (your loyalty wallet)
//
// Use `lex(key)` from server or client code. Importing the keyed map (rather
// than hard-coding "Seed Trove" everywhere) means the next rebrand is a diff
// inside this file, not a hunt across hundreds of components.

export type LexKey =
  // Brand
  | "trove.name"            // "Seed Trove"
  | "trove.tagline"
  // Currencies & units
  | "currency.point"        // "Seed" — singular
  | "currency.points"       // "Seeds" — plural
  | "currency.short"        // short-form unit, used in tight UI ("sd")
  // Verbs
  | "verb.earn"             // "Plant" (you plant a seed by acting)
  | "verb.redeem"           // "Harvest"
  | "verb.spend"            // "Trade" (used when redeeming for fruit)
  | "verb.donate"           // "Gift"
  // Nouns
  | "noun.reward"           // "Harvest"
  | "noun.giftCard"         // "Fruit Card"
  | "noun.certificate"      // "Harvest Certificate"
  | "noun.tier"             // "Grove" (membership tier)
  | "noun.streak"           // "Bloom"
  | "noun.ledger"           // "Trove Ledger"
  // Programs
  | "program.volunteer"     // "Nurture Hours"
  | "program.cme"           // "Provider Harvest Credits"
  | "program.fund"          // "Leafjourney Charitable Fund"
  | "program.feedback"      // "Whisper"
  // Status / wave
  | "status.planted"
  | "status.growing"
  | "status.harvestable"
  | "status.harvested";

const LEXICON: Record<LexKey, string> = {
  "trove.name": "Seed Trove",
  "trove.tagline": "Plant. Nurture. Harvest. Share the fruit.",

  "currency.point": "Seed",
  "currency.points": "Seeds",
  "currency.short": "sd",

  "verb.earn": "Plant",
  "verb.redeem": "Harvest",
  "verb.spend": "Trade",
  "verb.donate": "Gift",

  "noun.reward": "Harvest",
  "noun.giftCard": "Fruit Card",
  "noun.certificate": "Harvest Certificate",
  "noun.tier": "Grove",
  "noun.streak": "Bloom",
  "noun.ledger": "Trove Ledger",

  "program.volunteer": "Nurture Hours",
  "program.cme": "Provider Harvest Credits",
  "program.fund": "Leafjourney Charitable Fund",
  "program.feedback": "Whisper",

  "status.planted": "Planted",
  "status.growing": "Growing",
  "status.harvestable": "Ready to harvest",
  "status.harvested": "Harvested",
};

/**
 * Look up a Seed Trove label. Falls back to the key itself in dev so a typo
 * is loud rather than silently rendering an empty string.
 */
export function lex(key: LexKey): string {
  return LEXICON[key] ?? key;
}

/**
 * Pluralize a Seed Trove unit by count. Pure helper so it can be used in
 * server components without any state.
 */
export function lexPlural(count: number, key: "currency"): string {
  if (key === "currency") return count === 1 ? lex("currency.point") : lex("currency.points");
  return "";
}

/**
 * Patient-facing tiers ("Groves"). Order is meaningful — index 0 is entry tier.
 * Keep this list short; tier sprawl dilutes the metaphor.
 */
export const TROVE_TIERS = [
  { key: "sprout",   label: "Sprout Grove",   minSeeds: 0,     hue: "#9bbf8a" },
  { key: "sapling",  label: "Sapling Grove",  minSeeds: 500,   hue: "#6fa86a" },
  { key: "canopy",   label: "Canopy Grove",   minSeeds: 2000,  hue: "#4a8c5a" },
  { key: "old-growth", label: "Old-Growth Grove", minSeeds: 6000, hue: "#2d6e4f" },
] as const;

export type TroveTierKey = (typeof TROVE_TIERS)[number]["key"];

export function tierForSeeds(seeds: number): (typeof TROVE_TIERS)[number] {
  let current: (typeof TROVE_TIERS)[number] = TROVE_TIERS[0];
  for (const t of TROVE_TIERS) {
    if (seeds >= t.minSeeds) current = t;
  }
  return current;
}
