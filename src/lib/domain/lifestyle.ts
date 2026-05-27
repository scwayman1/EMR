/**
 * Lifestyle domain model — EMR-006
 *
 * The LIFESTYLE module is the cornerstone of the EMR: a personalized
 * care plan covering sleep, nutrition, movement, stress reduction,
 * family dynamics, habit formation, and social connectivity.
 *
 * These curated tips are the building blocks for AI-generated plans
 * tailored to each patient's conditions and goals.
 */

export interface LifestyleDomain {
  id: string;
  icon: string;       // emoji
  label: string;
  color: string;      // CSS color for the domain
  description: string;
}

export const LIFESTYLE_DOMAINS: LifestyleDomain[] = [
  { id: "sleep", icon: "\u{1F319}", label: "Sleep", color: "var(--info)", description: "Rest, recovery, and sleep hygiene" },
  { id: "nutrition", icon: "\u{1F957}", label: "Nutrition", color: "var(--success)", description: "Meal planning and mindful eating" },
  { id: "movement", icon: "\u{1F3C3}", label: "Movement", color: "var(--highlight)", description: "Exercise and physical activity" },
  { id: "stress", icon: "\u{1F9D8}", label: "Stress", color: "var(--accent)", description: "Mindfulness and stress reduction" },
  { id: "family", icon: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}", label: "Family", color: "#9b59b6", description: "Family dynamics and support" },
  { id: "habits", icon: "\u{1F504}", label: "Habits", color: "var(--warning)", description: "Building healthy routines" },
  { id: "social", icon: "\u{1F91D}", label: "Social", color: "var(--info)", description: "Community and connection" },
  { id: "spiritual", icon: "\u{1F54A}\u{FE0F}", label: "Spiritual", color: "#8e44ad", description: "Purpose, gratitude, and inner peace" },
  { id: "mindfulness", icon: "\u{1F9D8}\u200D\u2640\u{FE0F}", label: "Mindfulness", color: "var(--accent)", description: "Meditation, silence, breathing, and sunlight" },
];

export interface LifestyleTip {
  domain: string;
  title: string;
  body: string;
  difficulty: "easy" | "moderate" | "challenging";
  timeCommitment: string; // "5 min/day", "30 min/week"
}

// Curated tips per domain — these are the building blocks for AI-generated plans
export const LIFESTYLE_TIPS: Record<string, LifestyleTip[]> = {
  sleep: [
    { domain: "sleep", title: "Consistent bedtime", body: "Go to bed and wake up at the same time every day \u2014 even on weekends. Your body\u2019s internal clock thrives on consistency.", difficulty: "easy", timeCommitment: "0 min" },
    { domain: "sleep", title: "Screen curfew", body: "Turn off screens 1 hour before bed. Blue light suppresses melatonin. Try reading, stretching, or a warm bath instead.", difficulty: "moderate", timeCommitment: "60 min/day" },
    { domain: "sleep", title: "Cool, dark room", body: "Set your bedroom to 65\u201368\u00B0F. Use blackout curtains. Your body sleeps best when it\u2019s cool and dark.", difficulty: "easy", timeCommitment: "5 min" },
    { domain: "sleep", title: "No caffeine after 2pm", body: "Caffeine has a half-life of 5\u20136 hours. An afternoon coffee can still be in your system at midnight.", difficulty: "moderate", timeCommitment: "0 min" },
    { domain: "sleep", title: "Cannabis timing", body: "If using cannabis for sleep, take your dose 30\u201360 minutes before bed. Sublingual absorption takes 15\u201330 minutes.", difficulty: "easy", timeCommitment: "5 min" },
  ],
  nutrition: [
    { domain: "nutrition", title: "Hydrate first thing", body: "Drink 16oz of water within 30 minutes of waking. You\u2019re dehydrated after 8 hours of sleep.", difficulty: "easy", timeCommitment: "2 min/day" },
    { domain: "nutrition", title: "Protein at every meal", body: "Aim for 20\u201330g of protein per meal. It stabilizes blood sugar, reduces cravings, and supports recovery.", difficulty: "moderate", timeCommitment: "10 min/day" },
    { domain: "nutrition", title: "Anti-inflammatory foods", body: "Add turmeric, ginger, fatty fish, berries, and leafy greens. These reduce systemic inflammation that drives chronic pain.", difficulty: "moderate", timeCommitment: "15 min/day" },
    { domain: "nutrition", title: "Meal prep Sunday", body: "Spend 1\u20132 hours on Sunday preparing meals for the week. Removes daily decision fatigue.", difficulty: "challenging", timeCommitment: "2 hrs/week" },
  ],
  movement: [
    { domain: "movement", title: "10-minute walk", body: "Just 10 minutes of walking reduces pain perception, improves mood, and helps sleep. Start here.", difficulty: "easy", timeCommitment: "10 min/day" },
    { domain: "movement", title: "Gentle stretching", body: "5 minutes of stretching when you wake up. Focus on neck, shoulders, hips, and lower back.", difficulty: "easy", timeCommitment: "5 min/day" },
    { domain: "movement", title: "Strength training 2x/week", body: "Even bodyweight exercises (squats, pushups, planks) build muscle that protects joints and improves metabolism.", difficulty: "moderate", timeCommitment: "30 min, 2x/week" },
    { domain: "movement", title: "Post-cannabis movement", body: "Some patients find gentle yoga or walking after cannabis use enhances body awareness and reduces pain more than either alone.", difficulty: "easy", timeCommitment: "15 min" },
  ],
  stress: [
    { domain: "stress", title: "Box breathing", body: "Inhale 4 seconds \u2192 hold 4 seconds \u2192 exhale 4 seconds \u2192 hold 4 seconds. Do 4 rounds. Takes 2 minutes, works immediately.", difficulty: "easy", timeCommitment: "2 min" },
    { domain: "stress", title: "Morning journaling", body: "Write 3 things you\u2019re grateful for and 1 intention for the day. 5 minutes that reframes your entire outlook.", difficulty: "easy", timeCommitment: "5 min/day" },
    { domain: "stress", title: "Nature exposure", body: "Spend 20 minutes outside in nature. Forest bathing (shinrin-yoku) is clinically proven to reduce cortisol.", difficulty: "easy", timeCommitment: "20 min/day" },
    { domain: "stress", title: "Digital detox hour", body: "One hour per day with no phone, no email, no news. Protect your nervous system.", difficulty: "moderate", timeCommitment: "60 min/day" },
  ],
  family: [
    { domain: "family", title: "Device-free dinner", body: "One meal per day where everyone puts phones away. Connection happens in the small moments.", difficulty: "easy", timeCommitment: "30 min/day" },
    { domain: "family", title: "Weekly check-in", body: "A 15-minute weekly conversation with your partner or family about how everyone\u2019s really doing. Not logistics \u2014 feelings.", difficulty: "moderate", timeCommitment: "15 min/week" },
  ],
  habits: [
    { domain: "habits", title: "Habit stacking", body: "Attach a new habit to an existing one. \u2018After I brush my teeth, I will do 5 minutes of stretching.\u2019 The existing habit is the trigger.", difficulty: "easy", timeCommitment: "varies" },
    { domain: "habits", title: "2-minute rule", body: "Any new habit should take less than 2 minutes to start. \u2018Read 1 page\u2019 instead of \u2018Read for 30 minutes.\u2019 Scale up later.", difficulty: "easy", timeCommitment: "2 min" },
    { domain: "habits", title: "Track 3 things", body: "Pick 3 habits to track daily. Water, movement, and sleep are good starts. Use the outcomes page in this app.", difficulty: "easy", timeCommitment: "2 min/day" },
  ],
  social: [
    { domain: "social", title: "One real conversation", body: "Have one genuine conversation per day that isn\u2019t about work or logistics. Ask someone how they\u2019re really doing.", difficulty: "easy", timeCommitment: "10 min/day" },
    { domain: "social", title: "Support group", body: "Consider joining a support group for your condition. Shared experience reduces isolation and provides practical tips.", difficulty: "moderate", timeCommitment: "1 hr/week" },
    { domain: "social", title: "Volunteer once a month", body: "Helping others is one of the most evidence-backed ways to improve your own wellbeing.", difficulty: "moderate", timeCommitment: "2 hrs/month" },
  ],
  spiritual: [
    { domain: "spiritual", title: "Higher-power connection", body: "Five minutes of prayer, faith practice, or simply sitting in awe. Whatever 'higher power' means for you — connect with it once a day.", difficulty: "easy", timeCommitment: "5 min/day" },
    { domain: "spiritual", title: "Morning gratitude", body: "Write 3 things you're grateful for before looking at your phone. Takes 2 minutes. Reframes the entire day.", difficulty: "easy", timeCommitment: "2 min/day" },
    { domain: "spiritual", title: "Purpose journaling", body: "Once a week, write about what gives your life meaning. Purpose is protective — it reduces inflammation and improves outcomes.", difficulty: "moderate", timeCommitment: "15 min/week" },
    { domain: "spiritual", title: "Acts of kindness", body: "Do one intentional act of kindness per day. It doesn't have to be big. The act of giving activates the same reward pathways as receiving.", difficulty: "easy", timeCommitment: "5 min/day" },
    { domain: "spiritual", title: "Charity & service", body: "Give time, money, or skill to a cause you care about — at least once a month. Service is the most evidence-backed wellbeing intervention there is.", difficulty: "moderate", timeCommitment: "2 hrs/month" },
    { domain: "spiritual", title: "Family & friends time", body: "Block intentional time with the people who matter — at least 30 protected minutes, two times per week. Loneliness is a clinical risk factor.", difficulty: "easy", timeCommitment: "60 min/week" },
    { domain: "spiritual", title: "Meditation or prayer", body: "Ten minutes of quiet, every day. Meditation, prayer, contemplation — pick the one that fits you. Consistency matters more than tradition.", difficulty: "moderate", timeCommitment: "10 min/day" },
    { domain: "spiritual", title: "Nature & outdoor time", body: "Spend 20 minutes outdoors without your phone. Forest bathing (shinrin-yoku) has measurable effects on cortisol and blood pressure.", difficulty: "easy", timeCommitment: "20 min/day" },
  ],
  mindfulness: [
    { domain: "mindfulness", title: "5-minute meditation", body: "Sit quietly, eyes closed, focus on your breath. When your mind wanders, gently return. Start with 5 minutes. The practice is the returning.", difficulty: "easy", timeCommitment: "5 min/day" },
    { domain: "mindfulness", title: "Intentional silence", body: "Spend 10 minutes in complete silence — no music, no podcasts, no conversation. Let your nervous system rest.", difficulty: "easy", timeCommitment: "10 min/day" },
    { domain: "mindfulness", title: "Breathing exercises", body: "Try 4-7-8 breathing: inhale 4 seconds, hold 7, exhale 8. Three rounds. Activates the parasympathetic nervous system immediately.", difficulty: "easy", timeCommitment: "3 min" },
    { domain: "mindfulness", title: "Morning sunlight", body: "Get 10-15 minutes of natural sunlight within the first hour of waking. Sets your circadian rhythm, boosts serotonin, improves sleep quality.", difficulty: "easy", timeCommitment: "15 min/day" },
    { domain: "mindfulness", title: "Body scan before cannabis", body: "Before your dose, do a 3-minute body scan: notice where you're holding tension. This baseline awareness makes the therapeutic effects more intentional.", difficulty: "easy", timeCommitment: "3 min" },
  ],
};
