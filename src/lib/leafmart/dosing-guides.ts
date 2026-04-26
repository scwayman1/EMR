export type DosingFormat =
  | "tinctures"
  | "edibles"
  | "topicals"
  | "beverages"
  | "serums"
  | "capsules";

export interface DosingGuide {
  slug: DosingFormat;
  title: string;
  subtitle: string;
  /** Plain-format names that map to this guide (used for product → guide lookup). */
  matchFormats: string[];
  protocol: string;
  onset: string;
  duration: string;
  tips: string[];
  contraindications: string[];
  clinician: string;
  clinicianRole: string;
  /** Optional related product slugs (from DEMO_PRODUCTS). */
  relatedSlugs: string[];
  /** Pastel theme key for the hero. */
  bg: string;
  deep: string;
  /** Format icon shape used in the hero illustration. */
  shape: "bottle" | "can" | "jar" | "tin" | "serum" | "box";
}

export const DOSING_GUIDES: DosingGuide[] = [
  {
    slug: "tinctures",
    title: "Tinctures & Oils",
    subtitle: "Sublingual drops for precise, flexible dosing",
    matchFormats: ["tincture", "oil"],
    protocol:
      "Start with 5 mg CBD (or 2.5 mg THC where legal) under the tongue once daily. Hold for 60 seconds, then swallow. Reassess after 3 days; titrate up by 2.5–5 mg every 3 days only if you've noticed nothing meaningful. Most members settle between 10–25 mg total.",
    onset: "15–30 minutes sublingual · 45–90 minutes if swallowed",
    duration: "4–6 hours",
    tips: [
      "Hold the dose under your tongue for a full minute before swallowing — most of the absorption happens there.",
      "Take with a small amount of fat (a spoon of yogurt, a few nuts) to extend duration.",
      "Pick a consistent time each day for the first week so you can read the signal cleanly.",
      "Increase one variable at a time — don't change dose and timing in the same week.",
      "If you feel nothing the first session, that's normal. Give it 3 sessions before adjusting.",
    ],
    contraindications: [
      "Active blood thinners (warfarin, apixaban) — discuss with your prescriber first",
      "Significant liver impairment",
      "Pregnancy or breastfeeding",
      "Concurrent benzodiazepines or strong opioids without clinical oversight",
    ],
    clinician: "Dr. M. Castellanos",
    clinicianRole: "Medical Lead · Leafjourney Health",
    relatedSlugs: ["quiet-hours-tincture"],
    bg: "var(--butter)",
    deep: "#8A6A1F",
    shape: "bottle",
  },
  {
    slug: "edibles",
    title: "Edibles & Gummies",
    subtitle: "Slow, long, and easy to over-do — patience pays",
    matchFormats: ["edible", "gummy", "chocolate"],
    protocol:
      "Start at the lowest serving on the label — typically 2.5–5 mg THC or 10 mg CBD. Wait at least 2 hours before considering a second dose. Most members never need more than 5–10 mg THC for evening calm; CBD-forward edibles can range 25–50 mg.",
    onset: "45–120 minutes (slowest of any format)",
    duration: "6–8 hours · longer if you ate fatty food",
    tips: [
      "Eat with food but not on a heavy meal — a light snack speeds onset slightly.",
      "Set a 2-hour timer before taking more. Most over-dose stories happen in that window.",
      "Score gummies in half if you want to start at 2.5 mg.",
      "Avoid alcohol on the same evening — interaction is more pronounced than expected.",
      "Plan around the long tail: a 7 pm edible can affect you until midnight.",
    ],
    contraindications: [
      "History of THC-induced anxiety or panic — start with CBD-only",
      "Need to drive within 8 hours",
      "Cardiovascular conditions sensitive to elevated heart rate",
      "Pregnancy or breastfeeding",
    ],
    clinician: "Dr. M. Castellanos",
    clinicianRole: "Medical Lead · Leafjourney Health",
    relatedSlugs: [],
    bg: "var(--peach)",
    deep: "#9E5621",
    shape: "box",
  },
  {
    slug: "topicals",
    title: "Topicals & Balms",
    subtitle: "Targeted relief that doesn't reach the bloodstream",
    matchFormats: ["topical", "balm", "salve", "cream"],
    protocol:
      "Apply a pea-sized amount to clean, dry skin and massage in for 30 seconds. Cover the affected area without rubbing into broken skin. You can reapply every 4–6 hours as needed.",
    onset: "10–20 minutes localized",
    duration: "3–5 hours of localized effect",
    tips: [
      "Apply after a warm shower — open pores improve absorption.",
      "Wash hands after application to avoid transferring product to eyes.",
      "Layer over a thin moisturizer if your skin runs dry.",
      "Topicals are typically non-systemic — they won't show up on a urine drug test.",
      "If a spot is unresponsive after 3 days of regular use, try a different format alongside.",
    ],
    contraindications: [
      "Open wounds, cuts, or active eczema flares — don't apply on broken skin",
      "Allergy to any listed botanical (check ingredients)",
      "Avoid contact with eyes and mucous membranes",
    ],
    clinician: "Dr. M. Castellanos",
    clinicianRole: "Medical Lead · Leafjourney Health",
    relatedSlugs: ["field-balm-no-4"],
    bg: "var(--sage)",
    deep: "var(--leaf)",
    shape: "tin",
  },
  {
    slug: "beverages",
    title: "Beverages & Tonics",
    subtitle: "Faster, social, and easy to dose by the can",
    matchFormats: ["beverage", "drink", "tonic", "seltzer"],
    protocol:
      "Start with one full serving (typically 2.5–10 mg THC or 25 mg CBN) 30–60 minutes before you want effects. Don't restack within 90 minutes — the curve is faster than edibles but still has a tail.",
    onset: "15–45 minutes",
    duration: "2–4 hours · cleaner exit than edibles",
    tips: [
      "Sip slowly over 15 minutes — fast consumption feels harsher.",
      "If you're new, split a can over two evenings before drinking a whole one.",
      "Pair with hydrating non-alcoholic options — these are not meant to layer with alcohol.",
      "For sleep tonics, take 45–60 minutes before lights-out, not at lights-out.",
      "Keep refrigerated; cannabinoid potency degrades faster in warm storage.",
    ],
    contraindications: [
      "Same evening as alcohol or other depressants",
      "Driving or operating machinery within 4 hours",
      "Pregnancy or breastfeeding",
      "GI disorders that may be aggravated by carbonation",
    ],
    clinician: "Dr. M. Castellanos",
    clinicianRole: "Medical Lead · Leafjourney Health",
    relatedSlugs: ["stillwater-sleep-tonic"],
    bg: "var(--mint)",
    deep: "var(--leaf)",
    shape: "can",
  },
  {
    slug: "serums",
    title: "Serums & Skin Oils",
    subtitle: "Daily skin barrier care, plant-powered",
    matchFormats: ["serum", "skin-oil", "facial-oil"],
    protocol:
      "Apply 2–4 drops to clean skin morning or evening, after toner and before heavier moisturizers. Press into the skin rather than rubbing. Use consistently for 4–6 weeks before judging results.",
    onset: "Immediate skin feel · 2–4 weeks for visible barrier improvements",
    duration: "Cumulative — best with daily consistency",
    tips: [
      "Patch test on the inner forearm for 48 hours before facial use.",
      "Layer under SPF in the morning, after a hydrating toner.",
      "Avoid pairing with strong retinoids on the same night — alternate evenings.",
      "Store away from direct light to preserve cannabinoid stability.",
      "Photograph your skin weekly under the same lighting to track progress objectively.",
    ],
    contraindications: [
      "Active rosacea flare or open lesions",
      "Known sensitivity to hemp-derived ingredients",
      "Within 7 days of facial laser, peel, or microneedling",
    ],
    clinician: "Dr. M. Castellanos",
    clinicianRole: "Medical Lead · Leafjourney Health",
    relatedSlugs: ["gold-skin-serum"],
    bg: "var(--rose)",
    deep: "#9E4D45",
    shape: "serum",
  },
  {
    slug: "capsules",
    title: "Capsules & Softgels",
    subtitle: "Tasteless, repeatable, and built for daily routines",
    matchFormats: ["capsule", "softgel", "pill"],
    protocol:
      "Start with one capsule of the lowest available dose (typically 10–25 mg CBD) once daily with food. Reassess after 5–7 days; the steady-state effect of capsules is what you're judging, not a single dose.",
    onset: "60–120 minutes",
    duration: "6–8 hours · steady, not peaky",
    tips: [
      "Take at the same time daily — capsules reward routine.",
      "Take with a meal containing some fat to improve absorption.",
      "Don't open or split standardized softgels — dosing isn't even inside.",
      "Track with a simple weekly outcome scale to see drift over a month.",
      "If switching from a tincture, expect onset to be slower but duration longer.",
    ],
    contraindications: [
      "Difficulty swallowing pills",
      "Active blood thinners — discuss with your prescriber",
      "Significant liver impairment",
      "Pregnancy or breastfeeding",
    ],
    clinician: "Dr. M. Castellanos",
    clinicianRole: "Medical Lead · Leafjourney Health",
    relatedSlugs: [],
    bg: "var(--lilac)",
    deep: "#5C4972",
    shape: "jar",
  },
];

export function findGuideBySlug(slug: string): DosingGuide | undefined {
  return DOSING_GUIDES.find((g) => g.slug === slug);
}

export function findGuideByFormat(format: string): DosingGuide | undefined {
  const norm = format.toLowerCase();
  return DOSING_GUIDES.find((g) => g.matchFormats.some((f) => f.toLowerCase() === norm));
}

export function listGuides(): DosingGuide[] {
  return DOSING_GUIDES;
}
