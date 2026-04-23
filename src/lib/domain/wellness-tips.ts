// Wellness tips for patient daily widget

export interface WellnessTip {
  id: string;
  category: "mindfulness" | "sleep" | "nutrition" | "movement" | "cannabis" | "social";
  title: string;
  body: string;
  emoji: string;
}

export const WELLNESS_TIPS: WellnessTip[] = [
  { id: "w1", category: "sleep", emoji: "😴", title: "Wind down an hour before bed", body: "Put screens away. Dim the lights. Let your body know it's time to rest." },
  { id: "w2", category: "mindfulness", emoji: "🧘", title: "Try 4-7-8 breathing", body: "Inhale for 4, hold for 7, exhale for 8. Three rounds. Instant calm." },
  { id: "w3", category: "nutrition", emoji: "💧", title: "Hydrate before caffeinating", body: "A big glass of water first thing helps with dry mouth and jump-starts your day." },
  { id: "w4", category: "movement", emoji: "🚶", title: "10-minute walk after meals", body: "Helps digestion, stabilizes blood sugar, and clears your head." },
  { id: "w5", category: "cannabis", emoji: "🌱", title: "Start low, go slow", body: "When adjusting dose, increase only after 2-3 days at a given level." },
  { id: "w6", category: "social", emoji: "💬", title: "Reach out to one person today", body: "Even a 2-minute text strengthens your support network." },
  { id: "w7", category: "mindfulness", emoji: "🙏", title: "Three good things", body: "Before bed, name three things that went well today. Research shows this lifts mood." },
  { id: "w8", category: "sleep", emoji: "🌙", title: "Keep a consistent bedtime", body: "Your body loves rhythm. Same time in bed, same time waking up, even weekends." },
  { id: "w9", category: "nutrition", emoji: "🥗", title: "Add one vegetable", body: "Not cut out. Just add. Works better than restriction for most people." },
  { id: "w10", category: "movement", emoji: "🧍", title: "Stand up every hour", body: "Set a timer if you have to. Your spine will thank you." },
  { id: "w11", category: "cannabis", emoji: "📝", title: "Log your dose today", body: "Even a quick emoji. Your care team learns what works for you from what you track." },
  { id: "w12", category: "mindfulness", emoji: "🌳", title: "10 minutes outside", body: "Sunlight regulates sleep. Green space lowers stress. Both are free." },
  { id: "w13", category: "social", emoji: "❤️", title: "Schedule a hug", body: "Physical touch releases oxytocin. Pet your dog, hug a loved one, it counts." },
  { id: "w14", category: "cannabis", emoji: "📖", title: "Read one label today", body: "Know what's in your medicine. Cannabinoid ratios matter." },
];

export function getRandomTip(seed?: number): WellnessTip {
  const idx = seed !== undefined ? seed % WELLNESS_TIPS.length : Math.floor(Math.random() * WELLNESS_TIPS.length);
  return WELLNESS_TIPS[idx];
}

export function getTipOfTheDay(): WellnessTip {
  // Deterministic — same tip all day
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return WELLNESS_TIPS[dayOfYear % WELLNESS_TIPS.length];
}
