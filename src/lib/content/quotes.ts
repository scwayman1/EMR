/**
 * Motivational quotes — EMR-061
 *
 * A small, hand-curated set of quotes used by the patient-portal popup.
 * Quotes are tagged so the popup can match the patient's current state
 * (struggling, healing, thriving, etc.) without ever feeling tone-deaf.
 *
 * Pure data + tiny selection helpers. No DB, no React.
 */

export type QuoteMood =
  | "calm"
  | "encourage"
  | "celebrate"
  | "perseverance"
  | "gratitude";

export interface Quote {
  id: string;
  text: string;
  /** Attribution. Use "Unknown" — never fabricate. */
  author: string;
  moods: QuoteMood[];
}

export const MOTIVATIONAL_QUOTES: Quote[] = [
  {
    id: "rumi-wound",
    text: "The wound is the place where the Light enters you.",
    author: "Rumi",
    moods: ["calm", "perseverance"],
  },
  {
    id: "lao-tzu-step",
    text: "A journey of a thousand miles begins with a single step.",
    author: "Lao Tzu",
    moods: ["encourage", "perseverance"],
  },
  {
    id: "thoreau-direction",
    text: "It's not what you look at that matters, it's what you see.",
    author: "Henry David Thoreau",
    moods: ["calm"],
  },
  {
    id: "frankl-meaning",
    text: "Those who have a 'why' to live, can bear with almost any 'how'.",
    author: "Viktor Frankl",
    moods: ["perseverance"],
  },
  {
    id: "kabat-zinn-presence",
    text: "You can't stop the waves, but you can learn to surf.",
    author: "Jon Kabat-Zinn",
    moods: ["calm", "perseverance"],
  },
  {
    id: "angelou-rise",
    text: "You may encounter many defeats, but you must not be defeated.",
    author: "Maya Angelou",
    moods: ["perseverance", "encourage"],
  },
  {
    id: "rilke-questions",
    text: "Be patient toward all that is unsolved in your heart.",
    author: "Rainer Maria Rilke",
    moods: ["calm"],
  },
  {
    id: "obrien-small",
    text: "Small daily actions, repeated, become a life.",
    author: "Unknown",
    moods: ["encourage"],
  },
  {
    id: "fred-rogers-helpers",
    text: "When I was a boy and I would see scary things in the news, my mother would say, 'Look for the helpers.'",
    author: "Fred Rogers",
    moods: ["calm", "gratitude"],
  },
  {
    id: "maya-thanks",
    text: "Be a rainbow in someone else's cloud.",
    author: "Maya Angelou",
    moods: ["gratitude", "celebrate"],
  },
  {
    id: "jobs-dots",
    text: "You can't connect the dots looking forward; you can only connect them looking backwards.",
    author: "Steve Jobs",
    moods: ["perseverance"],
  },
  {
    id: "aurelius-now",
    text: "Confine yourself to the present.",
    author: "Marcus Aurelius",
    moods: ["calm"],
  },
  {
    id: "dickinson-hope",
    text: "Hope is the thing with feathers — that perches in the soul.",
    author: "Emily Dickinson",
    moods: ["encourage", "calm"],
  },
  {
    id: "thich-nhat-hanh-smile",
    text: "Smile, breathe, and go slowly.",
    author: "Thich Nhat Hanh",
    moods: ["calm"],
  },
  {
    id: "cs-lewis-too-old",
    text: "You are never too old to set another goal or to dream a new dream.",
    author: "C.S. Lewis",
    moods: ["encourage", "celebrate"],
  },
  {
    id: "anonymous-gentle",
    text: "Be gentle with yourself. You are doing the best you can.",
    author: "Unknown",
    moods: ["calm", "encourage"],
  },
];

const STORAGE_KEY = "motivational-quote-last-shown";

export function quotesForMood(mood: QuoteMood): Quote[] {
  return MOTIVATIONAL_QUOTES.filter((q) => q.moods.includes(mood));
}

/**
 * Pick a quote for the day. Uses the date as a seed so the same patient
 * sees the same quote on the same day, which avoids flash-of-different-
 * quote when navigating between pages.
 */
export function quoteOfTheDay(
  mood?: QuoteMood,
  now: Date = new Date(),
): Quote {
  const pool = mood ? quotesForMood(mood) : MOTIVATIONAL_QUOTES;
  const list = pool.length > 0 ? pool : MOTIVATIONAL_QUOTES;
  const dayIndex = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
  return list[dayIndex % list.length];
}

/** Random pick, biased away from the most recently shown quote (client-side). */
export function nextRandomQuote(mood?: QuoteMood): Quote {
  const pool = mood ? quotesForMood(mood) : MOTIVATIONAL_QUOTES;
  const list = pool.length > 0 ? pool : MOTIVATIONAL_QUOTES;
  let lastId: string | null = null;
  if (typeof window !== "undefined") {
    try {
      lastId = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* no-op */
    }
  }
  const candidates = list.filter((q) => q.id !== lastId);
  const choice = candidates[Math.floor(Math.random() * candidates.length)] ?? list[0];
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice.id);
    } catch {
      /* no-op */
    }
  }
  return choice;
}

export const QUOTE_STORAGE_KEY = STORAGE_KEY;
