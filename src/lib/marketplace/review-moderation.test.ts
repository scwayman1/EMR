import { describe, it, expect } from "vitest";
import {
  preModerateReview,
  moderateReview,
  moderateReviewFully,
  type ReviewSubmission,
} from "./review-moderation";

const baseReview: ReviewSubmission = {
  productSlug: "solace-nightfall-tincture",
  authorName: "Megan R.",
  rating: 5,
  title: "Real, restful sleep",
  body: "I have been using this nightly for three weeks and it has noticeably improved my sleep onset without leaving me groggy in the morning.",
  photos: [],
};

describe("preModerateReview", () => {
  it("passes a clean review", () => {
    expect(preModerateReview(baseReview).ok).toBe(true);
  });

  it("rejects too-short body", () => {
    const r = preModerateReview({ ...baseReview, body: "great" });
    expect(r.ok).toBe(false);
    expect(r.reasons.some((x) => x.startsWith("body_too_short_"))).toBe(true);
  });

  it("rejects out-of-range rating", () => {
    const r = preModerateReview({ ...baseReview, rating: 7 });
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("rating_out_of_range");
  });

  it("rejects banned terms", () => {
    const r = preModerateReview({
      ...baseReview,
      body: baseReview.body + " visit casino now",
    });
    expect(r.ok).toBe(false);
    expect(r.reasons.some((x) => x.startsWith("hard_block_"))).toBe(true);
  });

  it("rejects photos with disallowed mime", () => {
    const r = preModerateReview({
      ...baseReview,
      photos: [
        {
          id: "p-1",
          storageKey: "k",
          mimeType: "image/gif",
          sizeBytes: 100,
        },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.reasons.some((x) => x.startsWith("bad_mime_"))).toBe(true);
  });

  it("rejects oversized photos", () => {
    const r = preModerateReview({
      ...baseReview,
      photos: [
        {
          id: "p-2",
          storageKey: "k",
          mimeType: "image/jpeg",
          sizeBytes: 20 * 1024 * 1024,
        },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.reasons.some((x) => x.startsWith("photo_too_large_"))).toBe(true);
  });
});

describe("moderateReview", () => {
  it("auto-approves substantive, claim-free reviews", async () => {
    const result = await moderateReview(baseReview);
    expect(result.verdict).toBe("auto_approved");
  });

  it("flags medical claim hints for manual review", async () => {
    const result = await moderateReview({
      ...baseReview,
      body: "This product cured my chronic pain completely after one dose.",
    });
    expect(result.verdict).toBe("needs_review");
    expect(result.reasons).toContain("medical_claim_hint");
  });

  it("flags photos when caption hints at NSFW content", async () => {
    const result = await moderateReview({
      ...baseReview,
      photos: [
        {
          id: "p-3",
          storageKey: "k",
          mimeType: "image/jpeg",
          sizeBytes: 1024,
          caption: "definitely nsfw caption here",
        },
      ],
    });
    expect(result.verdict).toBe("needs_review");
    expect(result.photoFlags).toHaveLength(1);
    expect(result.photoFlags[0].photoId).toBe("p-3");
  });
});

describe("moderateReviewFully", () => {
  it("returns rejected when pre-moderation fails", async () => {
    const result = await moderateReviewFully({ ...baseReview, rating: 9 });
    expect(result.verdict).toBe("rejected");
  });
});
