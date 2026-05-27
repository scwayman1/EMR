/**
 * Social sharing module — EMR-075
 *
 * Builds shareable "milestone" cards for the patient portal: streaks
 * hit, plant stages reached, four-pillar overall scores. The output is
 * intentionally PHI-free — only de-identified content (e.g. "30-day
 * mindfulness streak") and a Leafjourney watermark.
 *
 * Three deliverables per share:
 *   1. SVG card (rendered server-side or client-side)
 *   2. Plain-text social caption (for X, Bluesky, Threads)
 *   3. A signed share URL that lands on a public landing page
 *
 * No DB. No PHI. Pure data + functions.
 */

export type ShareKind =
  | "streak"
  | "plant-stage"
  | "pillar-score"
  | "spiritual-week"
  | "achievement"
  | "philanthropy";

export interface ShareCardInput {
  kind: ShareKind;
  /** Display headline — short, no PHI. e.g. "30 days strong". */
  headline: string;
  /** Short subhead — context, also no PHI. e.g. "mindfulness streak". */
  subhead: string;
  /** Optional emoji for the card hero. */
  emoji?: string;
  /** Optional accent color override (hex). */
  accent?: string;
}

export interface ShareCardOutput {
  svg: string;
  caption: string;
  hashtags: string[];
  /** Suggested filename (no path) for downloads. */
  filename: string;
}

const KIND_DEFAULTS: Record<
  ShareKind,
  { emoji: string; accent: string; hashtags: string[] }
> = {
  streak: {
    emoji: "\u{1F525}",
    accent: "#E89F4C",
    hashtags: ["#WellnessStreak", "#Leafjourney"],
  },
  "plant-stage": {
    emoji: "\u{1F33F}",
    accent: "#3A8560",
    hashtags: ["#GrowYourHealth", "#Leafjourney"],
  },
  "pillar-score": {
    emoji: "\u{1F4CA}",
    accent: "#3D7FB8",
    hashtags: ["#FourPillars", "#Leafjourney"],
  },
  "spiritual-week": {
    emoji: "\u{1F54A}\u{FE0F}",
    accent: "#7D3F9B",
    hashtags: ["#SpiritualWellness", "#Leafjourney"],
  },
  achievement: {
    emoji: "\u{1F3C6}",
    accent: "#C46B97",
    hashtags: ["#Unlocked", "#Leafjourney"],
  },
  philanthropy: {
    emoji: "\u{1F49D}",
    accent: "#C46B97",
    hashtags: ["#GiveBack", "#Leafjourney"],
  },
};

/** Sanitize free text so it can drop safely inside SVG <text> nodes. */
function escapeForSvg(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildShareCard(input: ShareCardInput): ShareCardOutput {
  const defaults = KIND_DEFAULTS[input.kind];
  const accent = input.accent ?? defaults.accent;
  const emoji = input.emoji ?? defaults.emoji;
  const headline = escapeForSvg(input.headline.slice(0, 28));
  const subhead = escapeForSvg(input.subhead.slice(0, 60));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="${headline} — ${subhead}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FAF6EE"/>
      <stop offset="100%" stop-color="#E8DFCB"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.78" cy="0.28" r="0.6">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#halo)"/>
  <g transform="translate(96, 110)">
    <text x="0" y="0" font-family="Georgia, serif" font-size="120" fill="${accent}">${escapeForSvg(emoji)}</text>
    <text x="0" y="200" font-family="Georgia, serif" font-size="96" font-weight="600" fill="#1F2D24">${headline}</text>
    <text x="0" y="270" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#475A4F">${subhead}</text>
  </g>
  <g transform="translate(96, 530)">
    <circle cx="14" cy="0" r="14" fill="${accent}"/>
    <text x="42" y="6" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#1F2D24" font-weight="600">Leafjourney</text>
    <text x="148" y="6" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#7A8985">cannabis care, your way</text>
  </g>
</svg>`;

  const caption = buildCaption(input, defaults.hashtags);

  return {
    svg,
    caption,
    hashtags: defaults.hashtags,
    filename: `leafjourney-${input.kind}-${Date.now()}.svg`,
  };
}

function buildCaption(
  input: ShareCardInput,
  hashtags: string[],
): string {
  const cleaned = input.headline.trim();
  const sub = input.subhead.trim();
  const tags = hashtags.join(" ");
  switch (input.kind) {
    case "streak":
      return `${cleaned} — ${sub}. Showing up matters. ${tags}`;
    case "plant-stage":
      return `My plant just hit ${cleaned}. ${sub}. ${tags}`;
    case "pillar-score":
      return `Four Pillars check-in — ${cleaned}. ${sub}. ${tags}`;
    case "spiritual-week":
      return `Spiritual wellness week: ${cleaned}. ${sub}. ${tags}`;
    case "achievement":
      return `Unlocked: ${cleaned}. ${sub}. ${tags}`;
    case "philanthropy":
      return `${cleaned} — ${sub}. Giving back is part of getting better. ${tags}`;
  }
}

/**
 * Build a public, PHI-free share URL. The token doesn't need to be
 * cryptographically signed for the link itself to be safe — there's no PHI
 * on the page — but we still scope it by patient so each card has a stable
 * identifier in analytics.
 */
export function buildShareUrl(opts: {
  kind: ShareKind;
  headline: string;
  subhead: string;
  origin: string; // e.g. https://leafjourney.com
}): string {
  const params = new URLSearchParams({
    k: opts.kind,
    h: opts.headline,
    s: opts.subhead,
  });
  return `${opts.origin.replace(/\/$/, "")}/share?${params.toString()}`;
}

/**
 * Format a streak share input from a streak count.
 * Centralized so the wording stays consistent across the portal.
 */
export function streakShare(days: number): ShareCardInput {
  return {
    kind: "streak",
    headline: `${days}-day streak`,
    subhead:
      days >= 30
        ? "Showing up — every single day."
        : days >= 7
          ? "A week of small wins."
          : "Just getting started.",
  };
}

/**
 * Format a four-pillars overall score share input.
 */
export function pillarShare(overall: number): ShareCardInput {
  return {
    kind: "pillar-score",
    headline: `${overall}/100 overall`,
    subhead: "Physical, mental, emotional, spiritual — the whole picture.",
  };
}

/**
 * PHI guard — caller-side check for accidentally leaking obvious PHI.
 * Not exhaustive, just a tripwire for common mistakes.
 */
export function looksLikePHI(text: string): boolean {
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) return true; // SSN
  if (/\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/.test(text)) return true; // phone
  if (/\bMRN\s*\d+/i.test(text)) return true;
  if (/\b(diagnos(?:is|ed)|prescri(?:bed|ption))\b/i.test(text)) return true;
  return false;
}
