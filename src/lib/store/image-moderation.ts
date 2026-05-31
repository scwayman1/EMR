// SAFE: dead-export-allowed reason="EMR-306 deterministic moderation stand-in; real vision-model wiring lands when runVisionModeration is implemented"
// EMR-306 — AI safety moderation for review photos.
//
// Every customer-uploaded review image runs through this gate before it
// can be published. The ticket is explicit: no graphic / obscene / NSFW
// content, nothing that leaks the customer's PII, and nothing that could
// damage the product or brand. We model that as a set of categories the
// vision moderator scores; anything over the per-category threshold blocks
// the image and the reviewer is told why.
//
// `screenReviewImage` is the deterministic stand-in that lets the whole
// upload UX be exercised end-to-end before the real vision model is wired
// in. The real implementation swaps the body of `runVisionModeration` for
// a call to the configured model client — the public shape stays stable.

import "server-only";

/** Moderation categories the vision model scores 0..1. */
export type ImageRiskCategory =
  | "explicit" // nudity / sexual content
  | "graphic" // gore / violence
  | "pii" // faces, ID cards, addresses, anything identifying the customer
  | "brand_safety" // content that could damage the product or our store
  | "off_topic"; // not a product photo at all

export interface ImageModerationInput {
  photoId: string;
  mimeType: string;
  sizeBytes: number;
  /** Reviewer caption, scored alongside the pixels. */
  caption?: string;
  /**
   * Hints the demo scorer keys off of. In production these come from the
   * vision model; here they let tests drive deterministic verdicts without
   * shipping fixture binaries.
   */
  labels?: string[];
}

export interface ImageModerationVerdict {
  photoId: string;
  /** `true` only when the image is safe to publish on the storefront. */
  safe: boolean;
  /** Per-category score 0..1; >= threshold blocks the image. */
  scores: Record<ImageRiskCategory, number>;
  /** Categories that tripped, in severity order. */
  blockedBy: ImageRiskCategory[];
  /** Reviewer-facing explanation shown when the image is rejected. */
  reviewerMessage?: string;
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/** Per-category block thresholds. PII + explicit are strictest. */
const THRESHOLDS: Record<ImageRiskCategory, number> = {
  explicit: 0.35,
  graphic: 0.4,
  pii: 0.45,
  brand_safety: 0.55,
  off_topic: 0.85,
};

/** Reviewer-facing copy per category — never expose model internals. */
const REVIEWER_MESSAGES: Record<ImageRiskCategory, string> = {
  explicit:
    "This photo looks like it contains explicit content. Review photos must be safe for all shoppers.",
  graphic:
    "This photo looks graphic. Please upload a clear photo of the product instead.",
  pii: "This photo may show personal information (a face, an ID, or an address). Please crop it out before re-uploading.",
  brand_safety:
    "This photo can't be published as-is. Please upload a photo that shows the product clearly.",
  off_topic:
    "We couldn't tell this photo shows the product. Please upload a product photo so other shoppers can see it.",
};

function emptyScores(): Record<ImageRiskCategory, number> {
  return { explicit: 0, graphic: 0, pii: 0, brand_safety: 0, off_topic: 0 };
}

/**
 * Deterministic stand-in for the vision model. Keys off caption text and
 * the optional `labels` hint so the upload flow is fully testable. Replace
 * the body with a real model call without touching callers.
 */
function runVisionModeration(input: ImageModerationInput): Record<ImageRiskCategory, number> {
  const scores = emptyScores();
  const haystack = `${input.caption ?? ""} ${(input.labels ?? []).join(" ")}`.toLowerCase();

  const bump = (cat: ImageRiskCategory, terms: string[], weight = 0.9) => {
    if (terms.some((t) => haystack.includes(t))) scores[cat] = Math.max(scores[cat], weight);
  };

  bump("explicit", ["nude", "nsfw", "sexual", "explicit"]);
  bump("graphic", ["gore", "blood", "wound", "graphic"]);
  bump("pii", ["face", "id card", "driver", "passport", "address", "license plate"]);
  bump("brand_safety", ["competitor", "counterfeit", "logo swap", "obscene"], 0.7);
  bump("off_topic", ["meme", "screenshot", "selfie"], 0.9);

  return scores;
}

/**
 * Run a single review image through the safety gate. Format / size failures
 * short-circuit before any model spend.
 */
export function screenReviewImage(input: ImageModerationInput): ImageModerationVerdict {
  const scores = emptyScores();

  // Cheap structural gate first.
  if (!ALLOWED_MIME.has(input.mimeType)) {
    return {
      photoId: input.photoId,
      safe: false,
      scores,
      blockedBy: ["off_topic"],
      reviewerMessage: "Only JPEG, PNG, or WebP images are allowed.",
    };
  }
  if (input.sizeBytes > MAX_BYTES) {
    return {
      photoId: input.photoId,
      safe: false,
      scores,
      blockedBy: ["off_topic"],
      reviewerMessage: "Images must be 8 MB or smaller.",
    };
  }

  const modelScores = runVisionModeration(input);
  const blockedBy = (Object.keys(THRESHOLDS) as ImageRiskCategory[])
    .filter((cat) => modelScores[cat] >= THRESHOLDS[cat])
    .sort((a, b) => modelScores[b] - modelScores[a]);

  return {
    photoId: input.photoId,
    safe: blockedBy.length === 0,
    scores: modelScores,
    blockedBy,
    reviewerMessage: blockedBy.length > 0 ? REVIEWER_MESSAGES[blockedBy[0]] : undefined,
  };
}

/** Screen a batch of photos; returns one verdict per photo, order preserved. */
export function screenReviewImages(inputs: ImageModerationInput[]): ImageModerationVerdict[] {
  return inputs.map(screenReviewImage);
}

/** Convenience: were all photos in the batch safe to publish? */
export function allImagesSafe(verdicts: ImageModerationVerdict[]): boolean {
  return verdicts.every((v) => v.safe);
}
