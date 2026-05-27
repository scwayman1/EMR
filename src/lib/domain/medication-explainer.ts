// Medication Explainer — EMR-45 / EMR-133
// 3rd-grade reading level explanations for medications, cannabis, and supplements.
// Deterministic — no LLM calls.

export interface MedicationExplanation {
  name: string;
  simpleWhat: string;
  simpleHow: string;
  simpleWhere: string;
  simpleSideEffects: string;
  emoji: string;
  category: "cannabis" | "prescription" | "supplement" | "otc";
  cartoonHero?: string; // bigger emoji-illustration shown as page header
  storyLine?: string;   // single sentence read-aloud opener
}

const DB: MedicationExplanation[] = [
  // ── Cannabis ──────────────────────────────────────────
  { name: "THC", emoji: "\uD83C\uDF3F", category: "cannabis", simpleWhat: "The part of cannabis that can change how you feel.", simpleHow: "It works with tiny switches in your brain and body to help with pain, sleep, and appetite.", simpleWhere: "Brain, nerves, and stomach.", simpleSideEffects: "You might feel relaxed, hungry, or sleepy. Some people feel dizzy or have a dry mouth." },
  { name: "CBD", emoji: "\uD83D\uDCA7", category: "cannabis", simpleWhat: "A calm part of cannabis that does not make you feel high.", simpleHow: "It helps your body's own calming system work better.", simpleWhere: "Brain, muscles, and immune system.", simpleSideEffects: "Most people feel fine. Some notice a little tiredness or a change in appetite." },
  { name: "CBN", emoji: "\uD83C\uDF19", category: "cannabis", simpleWhat: "A sleepy part of cannabis.", simpleHow: "It gently tells your brain it is time to rest.", simpleWhere: "Brain.", simpleSideEffects: "You might feel very sleepy. That is usually the point." },
  { name: "CBG", emoji: "\uD83C\uDF31", category: "cannabis", simpleWhat: "The parent of other cannabinoids — it helps with calm and comfort.", simpleHow: "It works with your body's natural system to reduce worry and swelling.", simpleWhere: "Brain, gut, and eyes.", simpleSideEffects: "Very few. Some people notice a little dry mouth." },
  { name: "Tincture", emoji: "\uD83E\uDDF4", category: "cannabis", simpleWhat: "Cannabis oil drops you put under your tongue.", simpleHow: "The medicine soaks into the thin skin under your tongue and goes into your blood.", simpleWhere: "Starts under your tongue, then travels through your whole body.", simpleSideEffects: "It might taste earthy. Effects start in 15-30 minutes." },
  { name: "Edible", emoji: "\uD83C\uDF6A", category: "cannabis", simpleWhat: "Cannabis in food form — like a gummy or a chocolate.", simpleHow: "Your stomach digests it and your liver turns it into medicine.", simpleWhere: "Stomach and liver first, then your whole body.", simpleSideEffects: "Takes 30-90 minutes to feel. Lasts longer than other forms. Start with a tiny amount." },
  { name: "Topical", emoji: "\uD83E\uDDF4", category: "cannabis", simpleWhat: "Cannabis cream or balm you rub on your skin.", simpleHow: "The medicine soaks into the sore spot and helps right where it hurts.", simpleWhere: "Just the area where you put it — it does not travel through your body.", simpleSideEffects: "You will not feel high. The skin might tingle a little." },
  { name: "Vape", emoji: "\uD83D\uDCA8", category: "cannabis", simpleWhat: "Cannabis you breathe in as a warm mist.", simpleHow: "The medicine goes from your lungs straight into your blood very fast.", simpleWhere: "Lungs, then your whole body within minutes.", simpleSideEffects: "Works fast (1-5 minutes) but does not last as long. May irritate your throat." },
  { name: "Flower", emoji: "\uD83C\uDF3A", category: "cannabis", simpleWhat: "The dried plant you can breathe in.", simpleHow: "Heat releases the medicine and your lungs absorb it quickly.", simpleWhere: "Lungs, then your whole body.", simpleSideEffects: "Fast-acting. May cause coughing. Smell is strong." },

  // ── Common prescriptions ──────────────────────────────
  { name: "Ibuprofen", emoji: "\uD83D\uDC8A", category: "otc", simpleWhat: "A pain and swelling helper you can buy at the store.", simpleHow: "It blocks the chemicals in your body that cause pain and swelling.", simpleWhere: "Wherever there is pain or swelling — joints, muscles, head.", simpleSideEffects: "Take with food. It can upset your stomach if you take too much." },
  { name: "Acetaminophen", emoji: "\uD83C\uDF21\uFE0F", category: "otc", simpleWhat: "A pain and fever helper (like Tylenol).", simpleHow: "It tells your brain to turn down the pain and fever signals.", simpleWhere: "Your brain's pain center.", simpleSideEffects: "Easy on the stomach. Do not take too much — your liver works hard to process it." },
  { name: "Metformin", emoji: "\uD83C\uDF6F", category: "prescription", simpleWhat: "A helper for people with type 2 diabetes.", simpleHow: "It helps your body use sugar from food better so your blood sugar stays steady.", simpleWhere: "Liver and muscles.", simpleSideEffects: "Your tummy might feel upset at first. This usually gets better after a week or two." },
  { name: "Lisinopril", emoji: "\u2764\uFE0F", category: "prescription", simpleWhat: "A blood pressure medicine that relaxes your blood vessels.", simpleHow: "It stops a chemical that makes your blood vessels tight, so blood flows more easily.", simpleWhere: "Blood vessels all through your body.", simpleSideEffects: "Some people get a dry cough. Tell your care team if this happens." },
  { name: "Atorvastatin", emoji: "\uD83E\uDDC8", category: "prescription", simpleWhat: "A cholesterol medicine (like Lipitor) that protects your heart.", simpleHow: "It tells your liver to make less cholesterol so your blood vessels stay clean.", simpleWhere: "Liver.", simpleSideEffects: "Some people notice sore muscles. Let your care team know if that happens." },
  { name: "Omeprazole", emoji: "\uD83D\uDD25", category: "prescription", simpleWhat: "A stomach acid reducer (like Prilosec).", simpleHow: "It turns off the tiny pumps in your stomach that make acid.", simpleWhere: "Stomach lining.", simpleSideEffects: "Take before eating. Long-term use should be watched by your care team." },
  { name: "Sertraline", emoji: "\u2600\uFE0F", category: "prescription", simpleWhat: "A mood helper (like Zoloft) for anxiety and depression.", simpleHow: "It helps your brain keep more of a happiness chemical called serotonin.", simpleWhere: "Brain.", simpleSideEffects: "It can take 2-4 weeks to work fully. You might feel a little tired or jittery at first." },
  { name: "Gabapentin", emoji: "\u26A1", category: "prescription", simpleWhat: "A nerve calmer that helps with pain and sometimes sleep.", simpleHow: "It slows down overactive nerve signals so pain messages quiet down.", simpleWhere: "Nerves and brain.", simpleSideEffects: "You might feel sleepy or dizzy, especially at first." },
  { name: "Amoxicillin", emoji: "\uD83D\uDEE1\uFE0F", category: "prescription", simpleWhat: "An antibiotic that fights bacterial infections.", simpleHow: "It breaks open the walls of bad bacteria so they cannot survive.", simpleWhere: "Wherever the infection is — throat, ears, lungs, bladder.", simpleSideEffects: "Finish all of it, even if you feel better. May cause an upset stomach." },
  { name: "Prednisone", emoji: "\uD83D\uDCAA", category: "prescription", simpleWhat: "A strong anti-swelling medicine.", simpleHow: "It calms down your immune system when it is overreacting and causing swelling.", simpleWhere: "Whole body.", simpleSideEffects: "Can make you hungry, restless, or have trouble sleeping. Usually taken for a short time." },

  // ── Supplements ───────────────────────────────────────
  { name: "Vitamin D", emoji: "\u2600\uFE0F", category: "supplement", simpleWhat: "The sunshine vitamin — most people do not get enough.", simpleHow: "It helps your body use calcium to build strong bones and supports your immune system.", simpleWhere: "Bones, immune system, and mood.", simpleSideEffects: "Very safe at normal doses. Too much can cause nausea." },
  { name: "Magnesium", emoji: "\u2728", category: "supplement", simpleWhat: "A mineral your muscles and brain need to relax.", simpleHow: "It helps hundreds of chemical reactions in your body, including sleep and muscle function.", simpleWhere: "Muscles, brain, and heart.", simpleSideEffects: "High doses can cause loose stools. Start small." },
  { name: "Omega-3", emoji: "\uD83D\uDC1F", category: "supplement", simpleWhat: "Healthy fats found in fish oil.", simpleHow: "They help reduce swelling throughout your body and support your heart and brain.", simpleWhere: "Heart, brain, and joints.", simpleSideEffects: "Fishy aftertaste for some people. Take with food." },
  { name: "Melatonin", emoji: "\uD83C\uDF19", category: "supplement", simpleWhat: "A natural sleep helper your body already makes.", simpleHow: "It tells your brain that it is nighttime and time to sleep.", simpleWhere: "Brain's sleep center.", simpleSideEffects: "May cause vivid dreams. Start with the lowest dose (0.5-1mg)." },
  { name: "Probiotics", emoji: "\uD83E\uDDA0", category: "supplement", simpleWhat: "Good bacteria for your gut.", simpleHow: "They add helpful bacteria to your digestive system to keep things balanced.", simpleWhere: "Stomach and intestines.", simpleSideEffects: "Some gas or bloating at first. This usually settles down." },
  { name: "Turmeric", emoji: "\uD83D\uDFE1", category: "supplement", simpleWhat: "A golden spice that fights swelling.", simpleHow: "The curcumin inside it calms down inflammation throughout your body.", simpleWhere: "Joints, gut, and whole body.", simpleSideEffects: "Best absorbed with black pepper and fat. Very safe." },
  { name: "Zinc", emoji: "\uD83D\uDEE1\uFE0F", category: "supplement", simpleWhat: "A mineral that helps your immune system fight germs.", simpleHow: "It helps your immune cells work faster and better.", simpleWhere: "Immune system.", simpleSideEffects: "Take with food — it can upset an empty stomach." },
  { name: "Vitamin B12", emoji: "\u26A1", category: "supplement", simpleWhat: "An energy vitamin your nerves and blood cells need.", simpleHow: "It helps your body make red blood cells and keeps your nerves healthy.", simpleWhere: "Blood and nerves.", simpleSideEffects: "Very safe. Important for people who do not eat meat." },
  { name: "Iron", emoji: "\uD83E\uDDE2", category: "supplement", simpleWhat: "A mineral that helps your blood carry oxygen.", simpleHow: "It becomes part of your red blood cells so they can deliver oxygen everywhere.", simpleWhere: "Blood.", simpleSideEffects: "Can cause constipation or dark stools. Take with vitamin C for better absorption." },
];

// Build lookup indexes
const byNameLower = new Map<string, MedicationExplanation>();
for (const entry of DB) {
  byNameLower.set(entry.name.toLowerCase(), entry);
}

/**
 * Look up a medication/supplement/cannabis product by name.
 * Does fuzzy matching: exact match first, then substring, then prefix.
 */
export function lookupMedication(name: string): MedicationExplanation | null {
  const q = name.trim().toLowerCase();
  if (!q) return null;

  // Exact match
  const exact = byNameLower.get(q);
  if (exact) return exact;

  // Substring match
  for (const entry of DB) {
    if (entry.name.toLowerCase().includes(q) || q.includes(entry.name.toLowerCase())) {
      return entry;
    }
  }

  // Prefix match
  for (const entry of DB) {
    if (entry.name.toLowerCase().startsWith(q.slice(0, 3))) {
      return entry;
    }
  }

  return null;
}

/** Get all entries for a category */
export function getMedicationsByCategory(category: MedicationExplanation["category"]): MedicationExplanation[] {
  return DB.filter((e) => e.category === category);
}

/** Get all entries */
export function getAllMedications(): MedicationExplanation[] {
  return [...DB];
}
