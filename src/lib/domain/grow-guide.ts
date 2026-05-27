// Cannabis grow guide — EMR-130
// Static, deterministic stage-by-stage guidance for patients who grow at home.
// Pairs with the existing My Garden health metaphor.

export type GrowStage = "seedling" | "vegetative" | "flowering" | "harvest" | "cure";

export interface GrowGuideStage {
  id: GrowStage;
  emoji: string;
  label: string;
  durationDays: string;
  blurb: string;
  watering: string;
  light: string;
  feeding: string;
  watchFor: string[];
}

export const GROW_GUIDE_STAGES: GrowGuideStage[] = [
  {
    id: "seedling",
    emoji: "\u{1F331}",
    label: "Seedling",
    durationDays: "7–21 days",
    blurb: "The first leaves appear. Roots are tiny, so go gentle.",
    watering: "Mist daily. Soil should feel like a wrung-out sponge — never soggy.",
    light: "18 hours on / 6 hours off. Soft light at 18–24 inches above the plant.",
    feeding: "No fertilizer yet. Seedling stems carry their own starter nutrients.",
    watchFor: [
      "Yellowing leaves — likely overwatering",
      "Stretchy stem — light is too far away",
      "White fuzz on soil — lower humidity, more airflow",
    ],
  },
  {
    id: "vegetative",
    emoji: "\u{1F343}",
    label: "Vegetative",
    durationDays: "3–8 weeks",
    blurb: "The plant builds the structure that will hold all the flowers later.",
    watering: "When the top inch of soil is dry. Water until you see runoff from the pot.",
    light: "18–20 hours on / 4–6 hours off. Blue-spectrum light works best now.",
    feeding: "Nitrogen-heavy nutrients at half strength. Increase slowly.",
    watchFor: [
      "Slow growth — check pH (target 6.0–6.5 in soil)",
      "Burnt leaf tips — nutrients too strong, dilute next feed",
      "Light bend toward window — rotate pot every 2–3 days",
    ],
  },
  {
    id: "flowering",
    emoji: "\u{1F33A}",
    label: "Flowering",
    durationDays: "8–11 weeks",
    blurb: "Flip the lights to 12/12 and watch the buds form. This is the patience stage.",
    watering: "Same as veg, but watch — pots get heavier and dry slower as roots fill in.",
    light: "12 hours on / 12 hours off, on a strict schedule. Any light leak resets the clock.",
    feeding: "Switch to phosphorus + potassium-heavy bloom nutrients. Flush water for the last 7–10 days.",
    watchFor: [
      "Hermaphrodite flowers — isolate the plant immediately",
      "Bud rot in dense colas — increase airflow, reduce humidity",
      "Trichomes turning amber — you are close to harvest",
    ],
  },
  {
    id: "harvest",
    emoji: "\u{2702}\u{FE0F}",
    label: "Harvest",
    durationDays: "1–3 days",
    blurb: "Time it by the trichomes, not the calendar. Cloudy = peak THC, amber = more relaxing.",
    watering: "Flushed water only for the last week. None on harvest day.",
    light: "Lights off for 24–48 hours before chopping to push resin production.",
    feeding: "None.",
    watchFor: [
      "Use a 60x loupe to read trichomes",
      "Cut whole branches and hang upside down in a dark, 60°F room",
      "Aim for 50–60% room humidity during the dry",
    ],
  },
  {
    id: "cure",
    emoji: "\u{1FAD9}",
    label: "Cure",
    durationDays: "2–8 weeks",
    blurb: "The cure is the difference between flower that is okay and flower that is great.",
    watering: "Not applicable.",
    light: "Dark, sealed glass jars. Temperature 60–70°F.",
    feeding: "Burp jars 5 minutes daily for the first 2 weeks, then once a week.",
    watchFor: [
      "Ammonia smell — too wet, leave the jar open longer",
      "Crispy bud — add a humidity pack (62%)",
      "Smoothness improves dramatically after week 4",
    ],
  },
];

export interface GrowCommunityThread {
  id: string;
  title: string;
  author: string;
  authorBadge: string;
  replies: number;
  lastActive: string;
  tag: GrowStage | "general";
  preview: string;
}

// Mock community threads — in a real implementation these would come from
// a forum service. Kept here so the Garden community section is not empty
// in demos and tests.
export const GROW_COMMUNITY_THREADS: GrowCommunityThread[] = [
  {
    id: "t1",
    title: "First grow — are these trichomes ready?",
    author: "MeadowGrower",
    authorBadge: "First-time grower",
    replies: 12,
    lastActive: "2 hours ago",
    tag: "harvest",
    preview: "Mostly cloudy with about 10% amber. Indoor, 9 weeks into flower. Indica-dominant strain.",
  },
  {
    id: "t2",
    title: "Yellow lower leaves in week 4 of veg — nitrogen?",
    author: "QuietHarvest",
    authorBadge: "Year 2",
    replies: 8,
    lastActive: "yesterday",
    tag: "vegetative",
    preview: "pH is 6.3, runoff EC is in range. Only the bottom fan leaves are yellowing.",
  },
  {
    id: "t3",
    title: "Best cure jars for under $30?",
    author: "PorchPharmer",
    authorBadge: "Patient grower",
    replies: 21,
    lastActive: "3 days ago",
    tag: "cure",
    preview: "Looking for half-gallon mason jars or something better. What is your setup?",
  },
  {
    id: "t4",
    title: "Patient experience: growing my own brought my dose down 40%",
    author: "GardenSage",
    authorBadge: "Verified patient",
    replies: 47,
    lastActive: "this week",
    tag: "general",
    preview: "Six months into home-grown CBD-dominant flower. Documenting the milligram changes here.",
  },
];
