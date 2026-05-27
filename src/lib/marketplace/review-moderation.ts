// EMR-306 — Reviews with photos + AI moderation.
//
// Two-stage pipeline:
//   1. `preModerateReview` — cheap deterministic checks (length, banned
//      terms, photo MIME/size). Runs synchronously before the row is
//      persisted, blocks obvious garbage with no LLM cost.
//   2. `moderateReview` (async) — AI moderation of the review body and
//      attached photos via the configured model client. Tags the row
//      with a status that the public PDP query filters on.
//
// Anything that's `auto_approved` shows on the PDP immediately. Anything
// `needs_review` waits for a moderator. `rejected` never shows.

export type ModerationVerdict = "auto_approved" | "needs_review" | "rejected";

export interface ReviewPhoto {
  id: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  /** Optional caption written by the reviewer. */
  caption?: string;
}

export interface ReviewSubmission {
  productSlug: string;
  authorName: string;
  rating: number;
  title?: string;
  body: string;
  photos: ReviewPhoto[];
}

export interface PreModerationResult {
  ok: boolean;
  reasons: string[];
}

export interface ModerationResult {
  verdict: ModerationVerdict;
  /** Human-readable reasons surfaced to the moderator queue. */
  reasons: string[];
  /** Per-photo flags so the moderator UI can render which image tripped what. */
  photoFlags: Array<{ photoId: string; reasons: string[] }>;
}

const MIN_BODY = 20;
const MAX_BODY = 4000;
const MAX_TITLE = 120;
const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_PHOTO_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

// A small, deliberately conservative banlist used by the deterministic
// pre-moderation pass. The full medical-claim screening lives in
// fda-claim-screening.ts and runs in the AI pass.
const HARD_BLOCKED_TERMS = [
  "buy followers",
  "click here for",
  "casino",
  "bitcoin giveaway",
];

// Phrases that suggest the reviewer is making a medical claim. We don't
// auto-reject — the AI pass adjudicates — but we tag for moderator review.
const MEDICAL_CLAIM_HINTS = [
  /\bcure[sd]?\b/i,
  /\btreat[s]? cancer\b/i,
  /\breplaces? (my )?(prescription|medication|chemo)\b/i,
  /\bdiagnos(es|is|ed)\b/i,
];

export function preModerateReview(
  submission: ReviewSubmission,
): PreModerationResult {
  const reasons: string[] = [];

  if (!submission.authorName.trim()) reasons.push("author_name_required");
  if (Number.isNaN(submission.rating) || submission.rating < 1 || submission.rating > 5) {
    reasons.push("rating_out_of_range");
  }
  const body = submission.body.trim();
  if (body.length < MIN_BODY) reasons.push(`body_too_short_${MIN_BODY}`);
  if (body.length > MAX_BODY) reasons.push(`body_too_long_${MAX_BODY}`);

  if (submission.title && submission.title.length > MAX_TITLE) {
    reasons.push(`title_too_long_${MAX_TITLE}`);
  }

  if (submission.photos.length > MAX_PHOTOS) {
    reasons.push(`too_many_photos_${MAX_PHOTOS}`);
  }
  for (const p of submission.photos) {
    if (!ALLOWED_PHOTO_MIME.has(p.mimeType)) {
      reasons.push(`bad_mime_${p.id}_${p.mimeType}`);
    }
    if (p.sizeBytes > MAX_PHOTO_BYTES) {
      reasons.push(`photo_too_large_${p.id}`);
    }
  }

  const lower = body.toLowerCase();
  for (const term of HARD_BLOCKED_TERMS) {
    if (lower.includes(term)) {
      reasons.push(`hard_block_${term.replace(/\s+/g, "_")}`);
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Stage 2 — AI-assisted moderation of body + photos.
 *
 * The real implementation calls the configured model client to score the
 * body for spam / medical claims / abuse, and scans each photo for
 * NSFW / non-product content. Today we run a deterministic stand-in so
 * the storefront UX is testable end-to-end before the model wiring lands.
 */
export async function moderateReview(
  submission: ReviewSubmission,
): Promise<ModerationResult> {
  const reasons: string[] = [];
  const photoFlags: ModerationResult["photoFlags"] = [];

  const body = submission.body.trim();
  for (const pattern of MEDICAL_CLAIM_HINTS) {
    if (pattern.test(body)) {
      reasons.push("medical_claim_hint");
      break;
    }
  }

  // Photos: stand-in heuristic — flag photos with a caption that mentions
  // explicit / non-product content. Real impl runs vision moderation.
  for (const photo of submission.photos) {
    const flags: string[] = [];
    if (photo.caption && /\b(nude|nsfw)\b/i.test(photo.caption)) {
      flags.push("caption_nsfw_hint");
    }
    if (flags.length > 0) photoFlags.push({ photoId: photo.id, reasons: flags });
  }

  if (reasons.includes("medical_claim_hint") || photoFlags.length > 0) {
    return { verdict: "needs_review", reasons, photoFlags };
  }

  // Star-rating + body sanity — single-word "great" reviews go to manual
  // queue rather than auto-approve, so the PDP isn't padded with spam.
  if (body.split(/\s+/).length < 5) {
    return {
      verdict: "needs_review",
      reasons: ["low_substance"],
      photoFlags: [],
    };
  }

  return { verdict: "auto_approved", reasons: [], photoFlags: [] };
}

/**
 * Convenience: run both stages and collapse to a single verdict.
 * Pre-moderation failure short-circuits to `rejected`.
 */
export async function moderateReviewFully(
  submission: ReviewSubmission,
): Promise<ModerationResult> {
  const pre = preModerateReview(submission);
  if (!pre.ok) {
    return { verdict: "rejected", reasons: pre.reasons, photoFlags: [] };
  }
  return moderateReview(submission);
}
