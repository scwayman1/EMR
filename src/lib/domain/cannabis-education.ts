// Cannabis Education Database — EMR-78 / EMR-111
// Comprehensive cannabis education: strains, cannabinoids, terpenes,
// delivery methods, dosing guidelines. Searchable by condition or symptom.

export interface Cannabinoid {
  name: string;
  abbreviation: string;
  emoji: string;
  psychoactive: boolean;
  simpleDescription: string;
  benefits: string[];
  conditions: string[];
  typicalDoseRange: string;
  evidence: "strong" | "moderate" | "emerging" | "anecdotal";
}

export interface Terpene {
  name: string;
  emoji: string;
  aroma: string;
  simpleDescription: string;
  effects: string[];
  conditions: string[];
  foundIn: string[];
  evidence: "strong" | "moderate" | "emerging" | "anecdotal";
}

export interface DeliveryMethod {
  name: string;
  emoji: string;
  onset: string;
  duration: string;
  bioavailability: string;
  simpleDescription: string;
  bestFor: string[];
  cautions: string[];
}

export interface ConditionGuide {
  condition: string;
  emoji: string;
  recommendedCannabinoids: string[];
  recommendedTerpenes: string[];
  preferredDelivery: string[];
  dosingNote: string;
  evidence: "strong" | "moderate" | "emerging" | "anecdotal";
}

// ── Cannabinoids ────────────────────────────────────────

export const CANNABINOIDS: Cannabinoid[] = [
  { name: "THC", abbreviation: "THC", emoji: "\uD83C\uDF3F", psychoactive: true, simpleDescription: "The main active compound. Helps with pain, nausea, appetite, and sleep. Can cause a 'high' feeling.", benefits: ["Pain relief", "Nausea reduction", "Appetite stimulation", "Sleep aid", "Muscle relaxation"], conditions: ["chronic pain", "nausea", "insomnia", "appetite loss", "cancer", "PTSD", "fibromyalgia"], typicalDoseRange: "1-30 mg/day", evidence: "strong" },
  { name: "CBD", abbreviation: "CBD", emoji: "\uD83D\uDCA7", psychoactive: false, simpleDescription: "Non-intoxicating. Helps with anxiety, inflammation, and seizures. May soften THC's intensity.", benefits: ["Anxiety reduction", "Anti-inflammatory", "Seizure reduction", "Neuroprotection", "THC modulation"], conditions: ["anxiety", "epilepsy", "inflammation", "chronic pain", "PTSD", "insomnia"], typicalDoseRange: "5-100 mg/day", evidence: "strong" },
  { name: "CBN", abbreviation: "CBN", emoji: "\uD83C\uDF19", psychoactive: false, simpleDescription: "Mildly sedating. Often included in sleep products. Less studied than THC or CBD.", benefits: ["Sleep aid", "Mild pain relief", "Anti-inflammatory"], conditions: ["insomnia", "pain"], typicalDoseRange: "2.5-10 mg", evidence: "emerging" },
  { name: "CBG", abbreviation: "CBG", emoji: "\uD83C\uDF31", psychoactive: false, simpleDescription: "The 'parent' cannabinoid. Early research shows anxiety and inflammation benefits.", benefits: ["Anxiety reduction", "Anti-inflammatory", "Neuroprotection", "Antibacterial"], conditions: ["anxiety", "inflammation", "glaucoma", "IBD"], typicalDoseRange: "5-20 mg/day", evidence: "emerging" },
  { name: "CBC", abbreviation: "CBC", emoji: "\u2728", psychoactive: false, simpleDescription: "Non-intoxicating. May enhance mood and work synergistically with other cannabinoids.", benefits: ["Mood enhancement", "Anti-inflammatory", "Neurogenesis"], conditions: ["depression", "inflammation", "pain"], typicalDoseRange: "5-20 mg/day", evidence: "emerging" },
  { name: "THCV", abbreviation: "THCV", emoji: "\u26A1", psychoactive: true, simpleDescription: "A variant of THC with energizing effects. May suppress appetite at low doses.", benefits: ["Appetite suppression", "Energy boost", "Blood sugar regulation"], conditions: ["diabetes", "obesity", "PTSD"], typicalDoseRange: "5-20 mg/day", evidence: "emerging" },
];

// ── Terpenes ────────────────────────────────────────────

export const TERPENES: Terpene[] = [
  { name: "Myrcene", emoji: "\uD83E\uDD6D", aroma: "Earthy, musky, herbal", simpleDescription: "The most common cannabis terpene. Known for relaxation and sedation.", effects: ["Relaxation", "Sedation", "Pain relief", "Anti-inflammatory"], conditions: ["insomnia", "chronic pain", "inflammation"], foundIn: ["Mango", "Lemongrass", "Thyme", "Hops"], evidence: "moderate" },
  { name: "Limonene", emoji: "\uD83C\uDF4B", aroma: "Citrus, lemon, orange", simpleDescription: "Uplifting and mood-boosting. The bright, citrusy terpene.", effects: ["Mood elevation", "Stress relief", "Anti-anxiety", "Antifungal"], conditions: ["anxiety", "depression", "stress"], foundIn: ["Lemon", "Orange", "Lime", "Grapefruit"], evidence: "moderate" },
  { name: "Linalool", emoji: "\uD83C\uDF38", aroma: "Floral, lavender, sweet", simpleDescription: "The calming terpene found in lavender. Helps with anxiety and sleep.", effects: ["Calming", "Anti-anxiety", "Sleep aid", "Pain relief"], conditions: ["anxiety", "insomnia", "pain", "epilepsy"], foundIn: ["Lavender", "Mint", "Cinnamon", "Coriander"], evidence: "moderate" },
  { name: "Pinene", emoji: "\uD83C\uDF32", aroma: "Pine, fresh, woody", simpleDescription: "Sharp pine scent. May counteract some of THC's memory effects.", effects: ["Alertness", "Memory retention", "Anti-inflammatory", "Bronchodilator"], conditions: ["asthma", "inflammation", "pain"], foundIn: ["Pine needles", "Rosemary", "Basil", "Dill"], evidence: "moderate" },
  { name: "Caryophyllene", emoji: "\uD83C\uDF36\uFE0F", aroma: "Spicy, peppery, woody", simpleDescription: "The only terpene that also binds to cannabinoid receptors. Strong anti-inflammatory.", effects: ["Anti-inflammatory", "Pain relief", "Anti-anxiety", "Gastroprotective"], conditions: ["chronic pain", "anxiety", "arthritis", "IBD"], foundIn: ["Black pepper", "Cloves", "Cinnamon", "Oregano"], evidence: "strong" },
  { name: "Humulene", emoji: "\uD83C\uDF7A", aroma: "Earthy, woody, hoppy", simpleDescription: "Found in hops. May suppress appetite and reduce inflammation.", effects: ["Anti-inflammatory", "Appetite suppressant", "Antibacterial"], conditions: ["inflammation", "pain", "obesity"], foundIn: ["Hops", "Coriander", "Cloves", "Basil"], evidence: "emerging" },
  { name: "Terpinolene", emoji: "\uD83C\uDF3A", aroma: "Floral, piney, herbaceous", simpleDescription: "A complex terpene with mildly sedating effects. Less common.", effects: ["Sedation", "Antioxidant", "Antibacterial"], conditions: ["insomnia", "anxiety"], foundIn: ["Nutmeg", "Cumin", "Apples", "Lilac"], evidence: "emerging" },
  { name: "Ocimene", emoji: "\uD83C\uDF3C", aroma: "Sweet, herbal, woody", simpleDescription: "Found in many herbs. May have anti-inflammatory and antiviral properties.", effects: ["Anti-inflammatory", "Antiviral", "Antifungal", "Decongestant"], conditions: ["inflammation", "congestion"], foundIn: ["Mint", "Parsley", "Orchids", "Kumquats"], evidence: "emerging" },
];

// ── Delivery Methods ────────────────────────────────────

export const DELIVERY_METHODS: DeliveryMethod[] = [
  { name: "Sublingual (Oil/Tincture)", emoji: "\uD83E\uDDF4", onset: "15-30 min", duration: "4-6 hours", bioavailability: "20-35%", simpleDescription: "Drops under the tongue. Absorbs through thin mouth tissue into the bloodstream.", bestFor: ["Consistent daily dosing", "Anxiety", "Sleep", "Pain management"], cautions: ["Hold under tongue 60-90 seconds", "Take with a small fatty snack for better absorption"] },
  { name: "Oral (Capsule/Edible)", emoji: "\uD83D\uDC8A", onset: "30-90 min", duration: "6-8 hours", bioavailability: "6-20%", simpleDescription: "Swallowed and digested. Liver converts THC to a stronger form (11-OH-THC).", bestFor: ["Long-lasting relief", "Sleep", "Chronic pain", "Precise dosing (capsules)"], cautions: ["Do NOT re-dose before 2 hours", "Effects feel different than inhaled", "Start with half the dose you think you need"] },
  { name: "Inhalation (Vape)", emoji: "\uD83D\uDCA8", onset: "1-5 min", duration: "2-3 hours", bioavailability: "30-50%", simpleDescription: "Heated vapor breathed into the lungs. Fastest onset of all methods.", bestFor: ["Breakthrough pain", "Acute nausea", "Panic attacks", "Fast-acting relief"], cautions: ["Shorter duration means more frequent dosing", "May irritate lungs", "Avoid combustion (smoking) when possible"] },
  { name: "Topical (Cream/Balm)", emoji: "\uD83E\uDDD4", onset: "15-30 min", duration: "2-4 hours", bioavailability: "Local only", simpleDescription: "Applied to skin. Works locally — does not enter the bloodstream or cause a high.", bestFor: ["Joint pain", "Muscle soreness", "Skin conditions", "Localized inflammation"], cautions: ["Will not cause psychoactive effects", "Re-apply as needed", "Not absorbed systemically"] },
  { name: "Transdermal (Patch)", emoji: "\uD83E\uDE79", onset: "1-2 hours", duration: "8-12 hours", bioavailability: "~45%", simpleDescription: "A patch on the skin that slowly releases cannabinoids into the bloodstream over hours.", bestFor: ["Sustained relief", "Chronic pain", "People who forget doses"], cautions: ["Slow onset — not for breakthrough pain", "Can cause skin irritation at patch site"] },
  { name: "Suppository", emoji: "\uD83D\uDC8A", onset: "15-30 min", duration: "4-8 hours", bioavailability: "50-70%", simpleDescription: "Absorbed through rectal tissue. High bioavailability with minimal psychoactive effects.", bestFor: ["Patients who cannot swallow", "Severe nausea/vomiting", "Pelvic pain", "GI issues"], cautions: ["Less psychoactive than oral despite high absorption", "Requires specific product formulation"] },
];

// ── Condition Guides ────────────────────────────────────

export const CONDITION_GUIDES: ConditionGuide[] = [
  { condition: "Chronic Pain", emoji: "\uD83E\uDE7C", recommendedCannabinoids: ["THC", "CBD", "CBG"], recommendedTerpenes: ["Caryophyllene", "Myrcene", "Linalool"], preferredDelivery: ["Sublingual (Oil/Tincture)", "Topical (Cream/Balm)"], dosingNote: "Start with a 1:1 THC:CBD ratio. Increase THC gradually if pain is not controlled.", evidence: "strong" },
  { condition: "Insomnia", emoji: "\uD83C\uDF19", recommendedCannabinoids: ["THC", "CBN", "CBD"], recommendedTerpenes: ["Myrcene", "Linalool", "Terpinolene"], preferredDelivery: ["Sublingual (Oil/Tincture)", "Oral (Capsule/Edible)"], dosingNote: "Take 1-2 hours before bed. CBN + THC is more sedating than either alone.", evidence: "moderate" },
  { condition: "Anxiety", emoji: "\uD83D\uDE1F", recommendedCannabinoids: ["CBD", "CBG"], recommendedTerpenes: ["Limonene", "Linalool", "Caryophyllene"], preferredDelivery: ["Sublingual (Oil/Tincture)", "Inhalation (Vape)"], dosingNote: "Start with CBD-dominant. THC can worsen anxiety at higher doses — go very slow.", evidence: "strong" },
  { condition: "Nausea", emoji: "\uD83E\uDD22", recommendedCannabinoids: ["THC", "CBD"], recommendedTerpenes: ["Limonene", "Pinene"], preferredDelivery: ["Inhalation (Vape)", "Sublingual (Oil/Tincture)"], dosingNote: "Low-dose THC (1-2.5mg) is often enough. Inhaled works fastest for acute nausea.", evidence: "strong" },
  { condition: "Depression", emoji: "\uD83D\uDE1E", recommendedCannabinoids: ["CBD", "THC", "CBC"], recommendedTerpenes: ["Limonene", "Pinene", "Caryophyllene"], preferredDelivery: ["Sublingual (Oil/Tincture)", "Oral (Capsule/Edible)"], dosingNote: "CBD-dominant during the day, small THC addition in evening if needed. Avoid heavy sedation.", evidence: "moderate" },
  { condition: "Inflammation", emoji: "\uD83D\uDD25", recommendedCannabinoids: ["CBD", "CBG", "CBC"], recommendedTerpenes: ["Caryophyllene", "Humulene", "Myrcene"], preferredDelivery: ["Sublingual (Oil/Tincture)", "Topical (Cream/Balm)"], dosingNote: "Higher CBD doses (20-50mg) may be needed for significant inflammation.", evidence: "strong" },
  { condition: "PTSD", emoji: "\uD83D\uDEE1\uFE0F", recommendedCannabinoids: ["THC", "CBD", "THCV"], recommendedTerpenes: ["Linalool", "Limonene", "Myrcene"], preferredDelivery: ["Sublingual (Oil/Tincture)", "Oral (Capsule/Edible)"], dosingNote: "Low THC with CBD for daytime. Slightly higher THC for nightmares/sleep disruption.", evidence: "moderate" },
  { condition: "Migraine", emoji: "\uD83E\uDDE0", recommendedCannabinoids: ["THC", "CBD"], recommendedTerpenes: ["Myrcene", "Caryophyllene", "Linalool"], preferredDelivery: ["Inhalation (Vape)", "Sublingual (Oil/Tincture)"], dosingNote: "Inhaled at migraine onset for fastest relief. Sublingual for prevention.", evidence: "moderate" },
  { condition: "Appetite Loss", emoji: "\uD83C\uDF7D\uFE0F", recommendedCannabinoids: ["THC"], recommendedTerpenes: ["Myrcene", "Humulene"], preferredDelivery: ["Inhalation (Vape)", "Oral (Capsule/Edible)"], dosingNote: "Small THC dose 30-60 min before meals. Even 2.5mg can stimulate appetite.", evidence: "strong" },
  { condition: "Epilepsy/Seizures", emoji: "\u26A1", recommendedCannabinoids: ["CBD"], recommendedTerpenes: ["Linalool"], preferredDelivery: ["Sublingual (Oil/Tincture)", "Oral (Capsule/Edible)"], dosingNote: "High-dose CBD (100-300mg/day in studies). Must coordinate with neurologist.", evidence: "strong" },
];

// ── Search ──────────────────────────────────────────────

export interface SearchResult {
  type: "cannabinoid" | "terpene" | "delivery" | "condition";
  name: string;
  emoji: string;
  snippet: string;
}

export function searchEducationDatabase(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  const results: SearchResult[] = [];

  for (const c of CANNABINOIDS) {
    if (c.name.toLowerCase().includes(q) || c.abbreviation.toLowerCase().includes(q) || c.conditions.some((cond) => cond.includes(q)) || c.simpleDescription.toLowerCase().includes(q)) {
      results.push({ type: "cannabinoid", name: c.name, emoji: c.emoji, snippet: c.simpleDescription });
    }
  }
  for (const t of TERPENES) {
    if (t.name.toLowerCase().includes(q) || t.aroma.toLowerCase().includes(q) || t.conditions.some((cond) => cond.includes(q)) || t.simpleDescription.toLowerCase().includes(q)) {
      results.push({ type: "terpene", name: t.name, emoji: t.emoji, snippet: t.simpleDescription });
    }
  }
  for (const d of DELIVERY_METHODS) {
    if (d.name.toLowerCase().includes(q) || d.simpleDescription.toLowerCase().includes(q) || d.bestFor.some((b) => b.toLowerCase().includes(q))) {
      results.push({ type: "delivery", name: d.name, emoji: d.emoji, snippet: d.simpleDescription });
    }
  }
  for (const g of CONDITION_GUIDES) {
    if (g.condition.toLowerCase().includes(q) || g.recommendedCannabinoids.some((c) => c.toLowerCase().includes(q)) || g.recommendedTerpenes.some((t) => t.toLowerCase().includes(q))) {
      results.push({ type: "condition", name: g.condition, emoji: g.emoji, snippet: g.dosingNote });
    }
  }

  return results;
}
