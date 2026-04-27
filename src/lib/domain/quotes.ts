/**
 * Curated motivational quote library for EMR-061.
 * Themes: God, love, faith, emotions, energy, happiness, resilience,
 * persistence, not giving up, healing, wellness.
 *
 * 100+ quotes organized so the rotating selector feels fresh on every
 * page load.
 */

export interface Quote {
  text: string;
  author: string;
  theme:
    | "faith"
    | "love"
    | "resilience"
    | "persistence"
    | "happiness"
    | "energy"
    | "healing"
    | "hope"
    | "courage"
    | "gratitude";
}

export const QUOTES: Quote[] = [
  // Faith
  { text: "Faith is taking the first step even when you don't see the whole staircase.", author: "Martin Luther King Jr.", theme: "faith" },
  { text: "Faith is the bird that feels the light when the dawn is still dark.", author: "Rabindranath Tagore", theme: "faith" },
  { text: "Faith consists in believing when it is beyond the power of reason to believe.", author: "Voltaire", theme: "faith" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", author: "Joshua 1:9", theme: "faith" },
  { text: "I can do all things through Christ who strengthens me.", author: "Philippians 4:13", theme: "faith" },
  { text: "Trust in the Lord with all your heart, and lean not on your own understanding.", author: "Proverbs 3:5", theme: "faith" },
  { text: "The Lord is my shepherd; I shall not want.", author: "Psalm 23:1", theme: "faith" },

  // Love
  { text: "Where there is love there is life.", author: "Mahatma Gandhi", theme: "love" },
  { text: "Love cures people — both the ones who give it and the ones who receive it.", author: "Karl Menninger", theme: "love" },
  { text: "The best and most beautiful things in this world cannot be seen or even heard, but must be felt with the heart.", author: "Helen Keller", theme: "love" },
  { text: "To love and be loved is to feel the sun from both sides.", author: "David Viscott", theme: "love" },
  { text: "Love is the great miracle cure. Loving ourselves works miracles in our lives.", author: "Louise Hay", theme: "love" },
  { text: "Love is the bridge between you and everything.", author: "Rumi", theme: "love" },

  // Resilience
  { text: "Our greatest glory is not in never falling, but in rising every time we fall.", author: "Confucius", theme: "resilience" },
  { text: "The oak fought the wind and was broken, the willow bent when it must and survived.", author: "Robert Jordan", theme: "resilience" },
  { text: "You never know how strong you are until being strong is the only choice you have.", author: "Bob Marley", theme: "resilience" },
  { text: "Rock bottom became the solid foundation on which I rebuilt my life.", author: "J.K. Rowling", theme: "resilience" },
  { text: "The human capacity for burden is like bamboo — far more flexible than you'd ever believe at first glance.", author: "Jodi Picoult", theme: "resilience" },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb", theme: "resilience" },
  { text: "She stood in the storm, and when the wind did not blow her way, she adjusted her sails.", author: "Elizabeth Edwards", theme: "resilience" },

  // Persistence
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", theme: "persistence" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill", theme: "persistence" },
  { text: "Perseverance is not a long race; it is many short races one after the other.", author: "Walter Elliot", theme: "persistence" },
  { text: "Fall down seven times, get up eight.", author: "Japanese Proverb", theme: "persistence" },
  { text: "Never give up on something you really want. It's difficult to wait, but more difficult to regret.", author: "Unknown", theme: "persistence" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin", theme: "persistence" },

  // Happiness
  { text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama", theme: "happiness" },
  { text: "The greatest happiness you can have is knowing that you do not necessarily require happiness.", author: "William Saroyan", theme: "happiness" },
  { text: "For every minute you are angry you lose sixty seconds of happiness.", author: "Ralph Waldo Emerson", theme: "happiness" },
  { text: "Happiness is when what you think, what you say, and what you do are in harmony.", author: "Mahatma Gandhi", theme: "happiness" },
  { text: "The most important thing is to enjoy your life — to be happy — it's all that matters.", author: "Audrey Hepburn", theme: "happiness" },

  // Energy
  { text: "The energy of the mind is the essence of life.", author: "Aristotle", theme: "energy" },
  { text: "Your energy introduces you before you even speak.", author: "Unknown", theme: "energy" },
  { text: "Surround yourself with people whose energy lifts you up.", author: "Unknown", theme: "energy" },
  { text: "Energy flows where attention goes.", author: "James Redfield", theme: "energy" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", theme: "energy" },

  // Healing
  { text: "The wound is the place where the light enters you.", author: "Rumi", theme: "healing" },
  { text: "Healing takes courage, and we all have courage, even if we have to dig a little to find it.", author: "Tori Amos", theme: "healing" },
  { text: "The natural healing force within each of us is the greatest force in getting well.", author: "Hippocrates", theme: "healing" },
  { text: "To heal is to touch with love that which we previously touched with fear.", author: "Stephen Levine", theme: "healing" },
  { text: "Your body holds deep wisdom. Trust in it. Learn from it. Nourish it. Watch your life transform and be healthy.", author: "Bella Bleue", theme: "healing" },
  { text: "Healing is an art. It takes time, it takes practice, it takes love.", author: "Maza Dohta", theme: "healing" },

  // Hope
  { text: "Hope is being able to see that there is light despite all of the darkness.", author: "Desmond Tutu", theme: "hope" },
  { text: "Once you choose hope, anything's possible.", author: "Christopher Reeve", theme: "hope" },
  { text: "Hope is the thing with feathers that perches in the soul.", author: "Emily Dickinson", theme: "hope" },
  { text: "Where there is hope there is life, where there is life there is possibility.", author: "Unknown", theme: "hope" },
  { text: "Never lose hope. Storms make people stronger and never last forever.", author: "Roy T. Bennett", theme: "hope" },

  // Courage
  { text: "Courage is not the absence of fear, but the triumph over it.", author: "Nelson Mandela", theme: "courage" },
  { text: "You gain strength, courage, and confidence by every experience in which you really stop to look fear in the face.", author: "Eleanor Roosevelt", theme: "courage" },
  { text: "Life shrinks or expands in proportion to one's courage.", author: "Anaïs Nin", theme: "courage" },
  { text: "It takes courage to grow up and become who you really are.", author: "E.E. Cummings", theme: "courage" },
  { text: "Courage doesn't always roar. Sometimes courage is the quiet voice at the end of the day saying, 'I will try again tomorrow.'", author: "Mary Anne Radmacher", theme: "courage" },

  // Gratitude
  { text: "Gratitude turns what we have into enough.", author: "Aesop", theme: "gratitude" },
  { text: "Gratitude is the healthiest of all human emotions.", author: "Zig Ziglar", theme: "gratitude" },
  { text: "When you are grateful, fear disappears and abundance appears.", author: "Tony Robbins", theme: "gratitude" },
  { text: "The more grateful I am, the more beauty I see.", author: "Mary Davis", theme: "gratitude" },
  { text: "Gratitude makes sense of our past, brings peace for today, and creates a vision for tomorrow.", author: "Melody Beattie", theme: "gratitude" },

  // Mix — general wisdom
  { text: "The only way out is through.", author: "Robert Frost", theme: "resilience" },
  { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson", theme: "courage" },
  { text: "This too shall pass.", author: "Persian Adage", theme: "resilience" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair", theme: "courage" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein", theme: "resilience" },
  { text: "You are braver than you believe, stronger than you seem, and smarter than you think.", author: "A.A. Milne", theme: "courage" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe", theme: "persistence" },
  { text: "The best way out is always through.", author: "Robert Frost", theme: "resilience" },
  { text: "You don't have to see the whole staircase, just take the first step.", author: "Martin Luther King Jr.", theme: "faith" },
  { text: "Out of difficulties grow miracles.", author: "Jean de La Bruyère", theme: "hope" },
  { text: "Keep going. Your hardest times often lead to the greatest moments of your life.", author: "Roy T. Bennett", theme: "persistence" },
  { text: "The sun himself is weak when he first rises, and gathers strength and courage as the day gets on.", author: "Charles Dickens", theme: "energy" },

  // Faith — extended
  { text: "When you have come to the edge of all light that you know and are about to drop off into the darkness of the unknown, faith is knowing one of two things will happen: there will be something solid to stand on or you will be taught to fly.", author: "Patrick Overton", theme: "faith" },
  { text: "Faith is taking the first step even when you don’t see the whole staircase.", author: "Martin Luther King Jr.", theme: "faith" },
  { text: "Cast all your anxiety on him because he cares for you.", author: "1 Peter 5:7", theme: "faith" },
  { text: "He gives strength to the weary and increases the power of the weak.", author: "Isaiah 40:29", theme: "faith" },

  // Love — extended
  { text: "Being deeply loved by someone gives you strength, while loving someone deeply gives you courage.", author: "Lao Tzu", theme: "love" },
  { text: "We are most alive when we’re in love.", author: "John Updike", theme: "love" },
  { text: "Love yourself first and everything else falls into line.", author: "Lucille Ball", theme: "love" },

  // Resilience — extended
  { text: "When something bad happens you have three choices: let it define you, let it destroy you, or let it strengthen you.", author: "Dr. Seuss", theme: "resilience" },
  { text: "The strongest oak of the forest is not the one that is protected from the storm and hidden from the sun. It’s the one that stands in the open where it is compelled to struggle for its existence against the winds and rains and the scorching sun.", author: "Napoleon Hill", theme: "resilience" },
  { text: "Although the world is full of suffering, it is also full of the overcoming of it.", author: "Helen Keller", theme: "resilience" },
  { text: "On particularly rough days when I’m sure I can’t possibly endure, I like to remind myself that my track record for getting through bad days so far is 100% — and that’s pretty good.", author: "Unknown", theme: "resilience" },

  // Persistence — extended
  { text: "Many of life’s failures are people who did not realize how close they were to success when they gave up.", author: "Thomas Edison", theme: "persistence" },
  { text: "When you feel like quitting, think about why you started.", author: "Unknown", theme: "persistence" },
  { text: "A river cuts through rock not because of its power but because of its persistence.", author: "Jim Watkins", theme: "persistence" },

  // Happiness — extended
  { text: "Be happy for this moment. This moment is your life.", author: "Omar Khayyam", theme: "happiness" },
  { text: "The only joy in the world is to begin.", author: "Cesare Pavese", theme: "happiness" },
  { text: "Happiness can be found, even in the darkest of times, if one only remembers to turn on the light.", author: "J.K. Rowling", theme: "happiness" },

  // Energy — extended
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant", theme: "energy" },
  { text: "Take care of your body. It’s the only place you have to live.", author: "Jim Rohn", theme: "energy" },
  { text: "Slow breathing is like an anchor in the midst of an emotional storm.", author: "Russ Harris", theme: "energy" },

  // Healing — extended
  { text: "Healing yourself is connected with healing others.", author: "Yoko Ono", theme: "healing" },
  { text: "Pain is real. But so is hope.", author: "Unknown", theme: "healing" },
  { text: "What you allow into your body, mind, and life is what shapes you. Choose gently. Choose well.", author: "Unknown", theme: "healing" },
  { text: "There is no greater agony than bearing an untold story inside you.", author: "Maya Angelou", theme: "healing" },
  { text: "Above all, do not lose your desire to walk: every day I walk myself into a state of well-being and walk away from every illness.", author: "Søren Kierkegaard", theme: "healing" },

  // Hope — extended
  { text: "Hope is the only thing stronger than fear.", author: "Suzanne Collins", theme: "hope" },
  { text: "We must accept finite disappointment, but never lose infinite hope.", author: "Martin Luther King Jr.", theme: "hope" },
  { text: "When the world says, ‘Give up,’ hope whispers, ‘Try it one more time.’", author: "Unknown", theme: "hope" },
  { text: "There is some good in this world, and it’s worth fighting for.", author: "J.R.R. Tolkien", theme: "hope" },

  // Courage — extended
  { text: "Do one thing every day that scares you.", author: "Eleanor Roosevelt", theme: "courage" },
  { text: "All our dreams can come true, if we have the courage to pursue them.", author: "Walt Disney", theme: "courage" },
  { text: "Inhale courage, exhale fear.", author: "Unknown", theme: "courage" },

  // Gratitude — extended
  { text: "Acknowledging the good that you already have in your life is the foundation for all abundance.", author: "Eckhart Tolle", theme: "gratitude" },
  { text: "Wear gratitude like a cloak, and it will feed every corner of your life.", author: "Rumi", theme: "gratitude" },
  { text: "Be thankful for what you have; you’ll end up having more.", author: "Oprah Winfrey", theme: "gratitude" },

  // Mix — wisdom for the journey
  { text: "Suffering is not holding you. You are holding suffering. When you become good at the art of letting suffering go, you’ll find that you have nothing left.", author: "Osho", theme: "healing" },
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill", theme: "healing" },
  { text: "You don’t have to be perfect to be powerful.", author: "Unknown", theme: "courage" },
  { text: "Just when the caterpillar thought the world was over, it became a butterfly.", author: "Proverb", theme: "hope" },
];

/**
 * Pick a deterministic quote for a given "seed" key (e.g., a page path
 * + date) so that the same page shows the same quote within a session,
 * but rotates across different pages.
 */
export function quoteForSeed(seed: string): Quote {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return QUOTES[Math.abs(hash) % QUOTES.length];
}

/**
 * Pick a random quote (client-side only to avoid hydration mismatches).
 */
export function randomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
