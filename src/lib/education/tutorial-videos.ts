/**
 * EMR-100 — AI Tutorial Videos
 *
 * A curated catalog of short, friendly tutorial videos that walk
 * patients through the parts of LeafJourney they actually use. Each
 * description is written at a 3rd-grade reading level so a teenager,
 * a grandparent, or someone in pain at 2am can follow along. The
 * thumbnails are emoji + soft pastel so the page feels closer to a
 * children's book than a SaaS product.
 *
 * Progress tracking is intentionally local-first: we persist a
 * lightweight "watched" record per video in localStorage so a patient
 * who never logs in still keeps their progress, and a server action
 * can later sync it to the chart for cohort research.
 */

export type TutorialCategory =
  | "getting-started"
  | "managing-meds"
  | "reading-labs"
  | "using-portal";

export interface TutorialVideo {
  /** Stable id used for progress tracking. Never reuse. */
  id: string;
  category: TutorialCategory;
  title: string;
  /** Plain-language description, 3rd-grade reading level. */
  description: string;
  /** Emoji used as a soft thumbnail so we can ship without artwork. */
  emoji: string;
  /** Soft tailwind background class for the thumbnail. */
  thumbnailBg: string;
  /** Length in seconds. We label videos in m:ss format. */
  durationSeconds: number;
  /** Public video URL — empty during MVP; the player shows a friendly placeholder. */
  videoUrl?: string;
  /** Optional bullet list of what the patient will learn. */
  learnings?: string[];
}

export interface CategoryDefinition {
  id: TutorialCategory;
  title: string;
  /** Short blurb under the section header. */
  blurb: string;
  emoji: string;
}

export const TUTORIAL_CATEGORIES: CategoryDefinition[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    blurb: "First time here? Start with these. They are short and easy.",
    emoji: "🌱",
  },
  {
    id: "managing-meds",
    title: "Managing Meds",
    blurb: "How to log doses, refills, and how a medicine is helping you.",
    emoji: "💊",
  },
  {
    id: "reading-labs",
    title: "Reading Labs",
    blurb: "What the numbers mean, in plain words.",
    emoji: "🧪",
  },
  {
    id: "using-portal",
    title: "Using the Portal",
    blurb: "Tips and tricks to get more out of LeafJourney.",
    emoji: "✨",
  },
];

export const TUTORIAL_VIDEOS: TutorialVideo[] = [
  {
    id: "welcome-tour",
    category: "getting-started",
    title: "Welcome to LeafJourney",
    description:
      "A short tour of your home page. We show you where to find your meds, your labs, and how to send a message to your care team.",
    emoji: "👋",
    thumbnailBg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
    durationSeconds: 90,
    learnings: [
      "Find your home page",
      "See your care team",
      "Get help when you need it",
    ],
  },
  {
    id: "set-up-profile",
    category: "getting-started",
    title: "Set up your profile",
    description:
      "Add your name, your photo, and your favorite ways to talk to us. This helps us help you.",
    emoji: "👤",
    thumbnailBg: "bg-gradient-to-br from-sky-50 to-sky-100",
    durationSeconds: 75,
  },
  {
    id: "first-emoji-checkin",
    category: "getting-started",
    title: "Your first check-in",
    description:
      "Tap the smiley face that matches how you feel. That is it. We do the rest.",
    emoji: "😊",
    thumbnailBg: "bg-gradient-to-br from-amber-50 to-amber-100",
    durationSeconds: 60,
  },
  {
    id: "log-a-dose",
    category: "managing-meds",
    title: "How to log a dose",
    description:
      "After you take a medicine, tap the big green button. Pick a face. You are done in 5 seconds.",
    emoji: "⏱️",
    thumbnailBg: "bg-gradient-to-br from-violet-50 to-violet-100",
    durationSeconds: 80,
    learnings: ["Tap log dose", "Pick a feeling", "Add a note (optional)"],
  },
  {
    id: "ask-for-refill",
    category: "managing-meds",
    title: "Ask for a refill",
    description:
      "Running low on a medicine? Tap refill on the med card. We send the ask to your care team.",
    emoji: "🔄",
    thumbnailBg: "bg-gradient-to-br from-violet-50 to-violet-100",
    durationSeconds: 70,
  },
  {
    id: "rate-product",
    category: "managing-meds",
    title: "Rate a cannabis product",
    description:
      "Tell us how a product made you feel. 1 to 10. Your rating helps your doctor pick what works for you.",
    emoji: "⭐",
    thumbnailBg: "bg-gradient-to-br from-amber-50 to-amber-100",
    durationSeconds: 65,
  },
  {
    id: "what-is-a1c",
    category: "reading-labs",
    title: "What is A1C?",
    description:
      "A1C is like a 3-month report card for your blood sugar. We show you the numbers in green, yellow, or red.",
    emoji: "🍯",
    thumbnailBg: "bg-gradient-to-br from-rose-50 to-rose-100",
    durationSeconds: 110,
  },
  {
    id: "blood-pressure-101",
    category: "reading-labs",
    title: "Blood pressure made simple",
    description:
      "The top number is when your heart squeezes. The bottom number is when it rests. Both should not be too high.",
    emoji: "❤️",
    thumbnailBg: "bg-gradient-to-br from-rose-50 to-rose-100",
    durationSeconds: 95,
  },
  {
    id: "trend-arrows",
    category: "reading-labs",
    title: "Reading trend arrows",
    description:
      "An arrow up means your number went up. An arrow down means it went down. We help you know if that is good or not.",
    emoji: "📈",
    thumbnailBg: "bg-gradient-to-br from-sky-50 to-sky-100",
    durationSeconds: 70,
  },
  {
    id: "send-secure-message",
    category: "using-portal",
    title: "Message your care team",
    description:
      "Have a question? Tap messages. Type. Send. A real person on your team will write back.",
    emoji: "💬",
    thumbnailBg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
    durationSeconds: 60,
  },
  {
    id: "book-visit",
    category: "using-portal",
    title: "Book a visit",
    description:
      "Pick a day. Pick a time. Pick in-person or video. We send a reminder before your visit.",
    emoji: "📅",
    thumbnailBg: "bg-gradient-to-br from-sky-50 to-sky-100",
    durationSeconds: 85,
  },
  {
    id: "share-with-family",
    category: "using-portal",
    title: "Share access with family",
    description:
      "You can let a parent, child, or partner see your care plan. You stay in charge of who sees what.",
    emoji: "👪",
    thumbnailBg: "bg-gradient-to-br from-amber-50 to-amber-100",
    durationSeconds: 100,
  },
];

/** Format seconds as `m:ss` for thumbnail badges. */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Group the catalog by category, preserving the category order. */
export function groupByCategory(
  videos: TutorialVideo[] = TUTORIAL_VIDEOS,
): Array<{ category: CategoryDefinition; videos: TutorialVideo[] }> {
  return TUTORIAL_CATEGORIES.map((category) => ({
    category,
    videos: videos.filter((v) => v.category === category.id),
  }));
}

/* -------------------------------------------------------------------------- */
/* Progress tracking — localStorage so progress survives without a login.     */
/* -------------------------------------------------------------------------- */

const PROGRESS_KEY = "leaf:tutorial-progress:v1";

export interface TutorialProgress {
  /** Per-video watched-percent (0–100). */
  watched: Record<string, number>;
  /** Last time the patient watched anything (ISO). */
  lastWatchedAt?: string;
}

const EMPTY_PROGRESS: TutorialProgress = { watched: {} };

export function readProgress(): TutorialProgress {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.watched) {
      return EMPTY_PROGRESS;
    }
    return parsed as TutorialProgress;
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function writeProgress(progress: TutorialProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* private mode / quota — silently drop */
  }
}

export function markWatched(videoId: string, percent: number): TutorialProgress {
  const current = readProgress();
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const previous = current.watched[videoId] ?? 0;
  const next: TutorialProgress = {
    watched: { ...current.watched, [videoId]: Math.max(previous, clamped) },
    lastWatchedAt: new Date().toISOString(),
  };
  writeProgress(next);
  return next;
}

export function isCompleted(progress: TutorialProgress, videoId: string): boolean {
  return (progress.watched[videoId] ?? 0) >= 90;
}

export function completionStats(
  progress: TutorialProgress,
  videos: TutorialVideo[] = TUTORIAL_VIDEOS,
): { total: number; completed: number; percent: number } {
  const total = videos.length;
  const completed = videos.filter((v) => isCompleted(progress, v.id)).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, percent };
}
