/**
 * Cannabis-infused recipe library — EMR-089
 *
 * Hand-curated recipes that pair a cannabis edible (infused oil, butter,
 * tincture, etc.) with an anti-inflammatory or terpene-friendly meal.
 * Pure data only — the page renders them; there is no LLM dependency.
 *
 * Dosing math is illustrative — never present these as precise doses.
 * Patients should always titrate from their prescribed regimen.
 */

export type RecipeCourse =
  | "breakfast"
  | "main"
  | "snack"
  | "drink"
  | "dessert";

export type RecipeDiet = "vegan" | "vegetarian" | "gluten-free" | "dairy-free";

export interface Recipe {
  id: string;
  title: string;
  blurb: string;
  course: RecipeCourse;
  diets: RecipeDiet[];
  difficulty: "easy" | "medium" | "advanced";
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  /** Approx mg THC per serving — pre-decarbed flower into infused oil. */
  approxMgPerServing: number;
  ingredients: string[];
  steps: string[];
  /** Why a clinician might suggest this — one short sentence. */
  whyItHelps: string;
  /** Tags for browsing — terpenes, conditions, intent. */
  tags: string[];
}

export const RECIPES: Recipe[] = [
  {
    id: "golden-milk",
    title: "Golden Milk with Cannabis Tincture",
    blurb:
      "A warm, anti-inflammatory bedtime drink — turmeric, ginger, and a measured drop of CBD-forward tincture.",
    course: "drink",
    diets: ["vegan", "gluten-free"],
    difficulty: "easy",
    prepMinutes: 2,
    cookMinutes: 6,
    servings: 1,
    approxMgPerServing: 5,
    ingredients: [
      "1 cup oat or coconut milk",
      "1 tsp turmeric",
      "½ tsp grated fresh ginger",
      "Pinch of black pepper",
      "1 tsp honey or maple",
      "Cannabis tincture, your prescribed dose",
    ],
    steps: [
      "Warm the milk in a small saucepan — do not boil.",
      "Whisk in turmeric, ginger, and pepper. Simmer 5 minutes.",
      "Off heat, stir in sweetener.",
      "Pour into a mug and dose tincture last, off the stove.",
    ],
    whyItHelps:
      "Turmeric + black pepper boosts curcumin absorption; warm fat improves cannabinoid uptake. A gentle pre-bed ritual.",
    tags: ["sleep", "anti-inflammatory", "myrcene", "evening"],
  },
  {
    id: "infused-olive-oil",
    title: "Slow-Infused Olive Oil",
    blurb:
      "The pantry workhorse — a low-and-slow olive oil infusion you can drizzle over anything for the rest of the week.",
    course: "main",
    diets: ["vegan", "gluten-free", "dairy-free"],
    difficulty: "medium",
    prepMinutes: 10,
    cookMinutes: 120,
    servings: 24,
    approxMgPerServing: 4,
    ingredients: [
      "1 cup high-quality olive oil",
      "7g decarboxylated cannabis flower (decarb 240°F / 40 min)",
      "Cheesecloth + small jar",
    ],
    steps: [
      "Combine oil and decarbed flower in a slow cooker on low (or a saucepan held at 180–200°F).",
      "Hold the temperature for 2 hours, stirring occasionally.",
      "Strain through cheesecloth into a sealed jar.",
      "Refrigerate. Use within 2 months.",
    ],
    whyItHelps:
      "A reliable, neutral-tasting base for any meal — especially Mediterranean salads, hummus, and roasted vegetables.",
    tags: ["base", "low-temp", "kitchen-staple"],
  },
  {
    id: "anti-inflammatory-bowl",
    title: "Anti-Inflammatory Grain Bowl",
    blurb:
      "Roasted veg, leafy greens, salmon or chickpeas, and a finishing drizzle of infused olive oil.",
    course: "main",
    diets: ["gluten-free"],
    difficulty: "easy",
    prepMinutes: 15,
    cookMinutes: 25,
    servings: 2,
    approxMgPerServing: 4,
    ingredients: [
      "1 cup cooked quinoa or brown rice",
      "1 cup roasted broccoli or sweet potato",
      "Handful of spinach",
      "Salmon fillet OR ½ cup chickpeas",
      "1 tsp infused olive oil per serving (drizzle to finish)",
      "Lemon, salt, pepper",
    ],
    steps: [
      "Roast veg at 425°F for 20–25 minutes.",
      "Cook protein of choice.",
      "Build the bowl: grain → greens → veg → protein.",
      "Drizzle infused oil last. Heat will not destroy — but extreme heat reduces potency.",
    ],
    whyItHelps:
      "Omega-3-rich proteins, leafy greens, and turmeric-friendly veg pair with cannabis to reduce systemic inflammation.",
    tags: ["pain", "inflammation", "omega-3", "lunch"],
  },
  {
    id: "calming-cocoa",
    title: "Calming Cocoa with CBD",
    blurb:
      "A small cup of dark cocoa and CBD oil for a quiet evening — anandamide-friendly chemistry in a mug.",
    course: "drink",
    diets: ["vegan", "gluten-free"],
    difficulty: "easy",
    prepMinutes: 2,
    cookMinutes: 5,
    servings: 1,
    approxMgPerServing: 10,
    ingredients: [
      "1 cup oat milk",
      "1 tbsp unsweetened cocoa",
      "½ tsp cinnamon",
      "1 tsp maple",
      "Your prescribed CBD oil dose",
    ],
    steps: [
      "Warm milk gently.",
      "Whisk in cocoa, cinnamon, maple.",
      "Off heat, stir in CBD oil.",
    ],
    whyItHelps:
      "Cocoa contains compounds that gently inhibit anandamide breakdown — the body's own endocannabinoid.",
    tags: ["anxiety", "evening", "CBD"],
  },
  {
    id: "morning-smoothie",
    title: "Recovery Morning Smoothie",
    blurb:
      "Berries, spinach, banana, almond butter, and a low-dose CBD tincture — a breakfast that earns its name.",
    course: "breakfast",
    diets: ["vegan", "gluten-free", "dairy-free"],
    difficulty: "easy",
    prepMinutes: 5,
    cookMinutes: 0,
    servings: 1,
    approxMgPerServing: 5,
    ingredients: [
      "1 cup frozen berries",
      "Handful of spinach",
      "½ banana",
      "1 tbsp almond butter",
      "1 cup oat milk",
      "Your prescribed CBD dose",
    ],
    steps: [
      "Blend everything except the tincture until smooth.",
      "Pour, then dose tincture into the glass and stir briefly.",
    ],
    whyItHelps:
      "Antioxidant berries + leafy greens + healthy fat = good cannabinoid bioavailability and an easy gentle wake-up.",
    tags: ["morning", "antioxidant", "CBD"],
  },
  {
    id: "infused-honey",
    title: "Cannabis-Infused Honey",
    blurb:
      "A spoonful in tea, on toast, or over yogurt. Holds well in the fridge for months.",
    course: "snack",
    diets: ["gluten-free", "dairy-free"],
    difficulty: "medium",
    prepMinutes: 5,
    cookMinutes: 60,
    servings: 16,
    approxMgPerServing: 3,
    ingredients: [
      "1 cup raw honey",
      "3.5g decarbed flower",
      "Small mason jar + double-boiler",
    ],
    steps: [
      "Combine honey and decarbed flower in a sealed mason jar.",
      "Place in a double-boiler at 160–180°F for 1 hour, lid loose.",
      "Strain through cheesecloth back into the jar.",
      "Cool, seal, refrigerate.",
    ],
    whyItHelps:
      "A microdose-friendly base for tea or toast — easy to titrate by the half-teaspoon.",
    tags: ["microdose", "kitchen-staple", "evening"],
  },
];

export function recipesByCourse(course: RecipeCourse): Recipe[] {
  return RECIPES.filter((r) => r.course === course);
}

export function recipesByTag(tag: string): Recipe[] {
  return RECIPES.filter((r) => r.tags.includes(tag));
}

/** All unique tags across the library, sorted alphabetically. */
export function allRecipeTags(): string[] {
  const tags = new Set<string>();
  RECIPES.forEach((r) => r.tags.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}
