"use client";

// EMR-306 — Reviews with photos + AI moderation.
//
// Adds two things to the original review surface:
//
//   1. Photo galleries on each review. Tapping a thumbnail opens a
//      lightbox over the page; arrow keys cycle through the same set.
//   2. A client-side AI moderation gate on the submission form. The
//      gate runs heuristically here for the MVP (banned phrases, link
//      spam, all-caps shouting) and surfaces the verdict inline so the
//      reviewer can edit before they submit. The real model lives
//      server-side and is the source of truth — this is a pre-flight.

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LeafmartReview as BaseReview } from "./LeafmartProductCard";
import { StarRating } from "./StarRating";

export interface ReviewPhoto {
  id: string;
  url: string;
  alt?: string;
}

export interface LeafmartReviewWithPhotos extends BaseReview {
  photos?: ReviewPhoto[];
}

interface Props {
  reviews: LeafmartReviewWithPhotos[];
  averageRating: number;
  reviewCount: number;
  /**
   * When provided, renders the inline review composer. The parent owns
   * persistence — this component just runs the moderation pre-flight
   * and hands a clean payload to the callback.
   */
  onSubmit?: (payload: SubmitReviewPayload) => Promise<void>;
}

export interface SubmitReviewPayload {
  rating: number;
  title: string;
  body: string;
  photos: File[];
}

type SortMode = "most-helpful" | "newest" | "highest" | "lowest" | "with-photos";

const SORTS: Array<{ id: SortMode; label: string }> = [
  { id: "most-helpful", label: "Most helpful" },
  { id: "newest", label: "Newest" },
  { id: "highest", label: "Highest rated" },
  { id: "lowest", label: "Lowest rated" },
  { id: "with-photos", label: "With photos" },
];

export function ProductReviews({
  reviews,
  averageRating,
  reviewCount,
  onSubmit,
}: Props) {
  const [sort, setSort] = useState<SortMode>("most-helpful");
  const [showAll, setShowAll] = useState(false);
  const [lightbox, setLightbox] = useState<{
    photos: ReviewPhoto[];
    index: number;
  } | null>(null);

  const distribution = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0];
    for (const r of reviews) {
      const idx = Math.max(0, Math.min(4, Math.round(r.rating) - 1));
      buckets[idx] += 1;
    }
    return buckets;
  }, [reviews]);

  const photoCount = useMemo(
    () => reviews.reduce((acc, r) => acc + (r.photos?.length ?? 0), 0),
    [reviews]
  );

  const sorted = useMemo(() => {
    const list = [...reviews];
    switch (sort) {
      case "newest":
        return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      case "highest":
        return list.sort((a, b) => b.rating - a.rating);
      case "lowest":
        return list.sort((a, b) => a.rating - b.rating);
      case "with-photos":
        return list
          .filter((r) => (r.photos?.length ?? 0) > 0)
          .sort((a, b) => (b.photos?.length ?? 0) - (a.photos?.length ?? 0));
      case "most-helpful":
      default:
        return list.sort((a, b) => {
          const score = (r: LeafmartReviewWithPhotos) =>
            (r.verified ? 100 : 0) +
            (r.body?.length ?? 0) / 10 +
            r.rating +
            (r.photos?.length ?? 0) * 5;
          return score(b) - score(a);
        });
    }
  }, [reviews, sort]);

  const visible = showAll ? sorted : sorted.slice(0, 3);
  const totalKnown = reviews.length || reviewCount;
  const max = Math.max(1, ...distribution);

  const openLightbox = useCallback(
    (photos: ReviewPhoto[], index: number) => setLightbox({ photos, index }),
    []
  );
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const stepLightbox = useCallback(
    (delta: number) =>
      setLightbox((cur) =>
        cur
          ? {
              ...cur,
              index: (cur.index + delta + cur.photos.length) % cur.photos.length,
            }
          : cur
      ),
    []
  );

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") stepLightbox(1);
      if (e.key === "ArrowLeft") stepLightbox(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, closeLightbox, stepLightbox]);

  if (reviews.length === 0 && !onSubmit) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-14 py-10 sm:py-12 max-w-[1440px] mx-auto border-t border-[var(--border)]">
      <div className="mb-6 sm:mb-8">
        <p className="eyebrow text-[var(--leaf)] mb-2">What patients say</p>
        <h2 className="font-display text-[26px] sm:text-[32px] font-normal tracking-tight text-[var(--ink)]">
          Reviews
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 sm:gap-12">
        <div className="rounded-2xl bg-[var(--surface-muted)] p-5 sm:p-6">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-display text-[42px] font-medium leading-none text-[var(--ink)] tabular-nums">
              {averageRating > 0 ? averageRating.toFixed(1) : "—"}
            </span>
            <span className="text-[var(--muted)] text-sm">/ 5</span>
          </div>
          <StarRating rating={averageRating} size={16} className="mb-2" />
          <p className="text-[12.5px] text-[var(--muted)]">
            Based on {reviewCount.toLocaleString()} {reviewCount === 1 ? "review" : "reviews"}
            {photoCount > 0 && ` · ${photoCount} photos`}
          </p>

          <div className="mt-5 space-y-1.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = distribution[stars - 1];
              const pct = totalKnown > 0 ? (count / max) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-2 text-[12px]">
                  <span className="w-3 text-[var(--muted)] tabular-nums">{stars}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" className="text-[var(--leaf)]" aria-hidden="true">
                    <path
                      d="M12 2.5l2.95 6.13 6.55.87-4.78 4.59 1.18 6.5L12 17.6l-6.0 2.99 1.18-6.5L2.5 9.5l6.55-.87L12 2.5z"
                      fill="currentColor"
                    />
                  </svg>
                  <div className="flex-1 h-[6px] rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--leaf)] transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-[var(--muted)] tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>

          {onSubmit && <ReviewComposer onSubmit={onSubmit} />}
        </div>

        <div>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <p className="text-[13px] text-[var(--muted)]">
              Showing {visible.length} of {sorted.length}
            </p>
            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] p-1 bg-[var(--surface)]">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={`px-3 py-1.5 rounded-full text-[11.5px] font-medium transition-colors ${
                    sort === s.id
                      ? "bg-[var(--ink)] text-[var(--bg)]"
                      : "text-[var(--text-soft)] hover:text-[var(--ink)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-[13px] text-[var(--muted)]">
              No written reviews yet. Be the first to share your experience.
            </div>
          ) : (
            <ul className="space-y-4">
              {visible.map((r) => (
                <ReviewCard key={r.id} review={r} onOpenPhoto={openLightbox} />
              ))}
            </ul>
          )}

          {sorted.length > 3 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-5 text-[13px] font-medium text-[var(--leaf)] hover:underline inline-flex items-center gap-1"
            >
              {showAll ? "Show fewer reviews" : `Show all ${sorted.length} reviews`}
              <span aria-hidden="true">{showAll ? "↑" : "↓"}</span>
            </button>
          )}
        </div>
      </div>

      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onClose={closeLightbox}
          onStep={stepLightbox}
        />
      )}
    </section>
  );
}

function ReviewCard({
  review,
  onOpenPhoto,
}: {
  review: LeafmartReviewWithPhotos;
  onOpenPhoto: (photos: ReviewPhoto[], index: number) => void;
}) {
  const date = new Date(review.createdAt);
  const dateLabel = isNaN(+date)
    ? review.createdAt
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const photos = review.photos ?? [];

  return (
    <li className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5">
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <StarRating rating={review.rating} size={14} />
          {review.title && (
            <h4 className="font-display text-[16px] font-medium text-[var(--ink)] leading-tight">
              {review.title}
            </h4>
          )}
        </div>
        <time className="text-[11.5px] text-[var(--muted)] whitespace-nowrap">{dateLabel}</time>
      </div>
      {review.body && (
        <p className="text-[13.5px] text-[var(--text-soft)] leading-relaxed mb-3">{review.body}</p>
      )}

      {photos.length > 0 && (
        <ul className="flex items-center gap-2 mb-3 flex-wrap">
          {photos.map((photo, i) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => onOpenPhoto(photos, i)}
                className="block w-16 h-16 rounded-xl overflow-hidden bg-[var(--surface-muted)] border border-[var(--border)] hover:border-[var(--leaf)] transition-colors"
                aria-label={photo.alt ?? "Review photo"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.alt ?? ""}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 text-[11.5px] text-[var(--muted)]">
        <span className="font-medium text-[var(--text)]">{review.authorName}</span>
        {review.verified && (
          <span className="inline-flex items-center gap-1 text-[var(--leaf)] font-semibold">
            <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
              <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3.5 6.2L5.2 7.8L8.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Verified buyer
          </span>
        )}
      </div>
    </li>
  );
}

function Lightbox({
  photos,
  index,
  onClose,
  onStep,
}: {
  photos: ReviewPhoto[];
  index: number;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  const photo = photos[index];
  if (!photo) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt ?? "Review photo"}
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-6"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close photo"
        className="absolute top-5 right-5 text-white/85 hover:text-white text-xl"
      >
        ×
      </button>
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStep(-1);
            }}
            className="absolute left-4 sm:left-8 text-white/80 hover:text-white text-3xl"
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStep(1);
            }}
            className="absolute right-4 sm:right-8 text-white/80 hover:text-white text-3xl"
            aria-label="Next photo"
          >
            ›
          </button>
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.alt ?? ""}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
      />
    </div>
  );
}

/* ── Composer + AI moderation pre-flight ────────────────────── */

const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

interface ModerationVerdict {
  ok: boolean;
  message?: string;
}

/** Tiny, transparent moderation pass run client-side for instant feedback. */
function moderateReview(title: string, body: string): ModerationVerdict {
  const text = `${title} ${body}`.trim();
  if (text.length < 12) {
    return { ok: false, message: "Reviews need a bit more detail — share what worked or didn't." };
  }
  // Shouting heuristic — >70% caps in a long string.
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 30) {
    const upper = letters.replace(/[^A-Z]/g, "").length;
    if (upper / letters.length > 0.7) {
      return { ok: false, message: "Try toning down the all-caps so other patients can scan your review." };
    }
  }
  if (/(https?:\/\/|www\.)\S+/i.test(text)) {
    return { ok: false, message: "Links aren't allowed in reviews." };
  }
  if (/\b(scam|fraud|fake)\b.*\b(refund|chargeback)\b/i.test(text)) {
    return {
      ok: false,
      message: "If you're reporting fraud, please contact support directly so we can investigate.",
    };
  }
  if (/\b(prescribe|cure|treat)\s+(cancer|covid|hiv|diabetes)\b/i.test(text)) {
    return {
      ok: false,
      message: "We can't publish medical claims. Share what you experienced instead.",
    };
  }
  if (/\b(my (kid|child|son|daughter)|under\s*21)\b/i.test(text)) {
    return {
      ok: false,
      message: "Cannabis content is restricted to adults 21+. Please remove references to minors.",
    };
  }
  return { ok: true };
}

function ReviewComposer({
  onSubmit,
}: {
  onSubmit: (payload: SubmitReviewPayload) => Promise<void>;
}) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<ModerationVerdict | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter((f) => f.size <= MAX_PHOTO_BYTES);
    setPhotos((prev) => [...prev, ...valid].slice(0, MAX_PHOTOS));
    e.target.value = "";
  };

  const removePhoto = (i: number) =>
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    const v = moderateReview(title, body);
    setVerdict(v);
    if (!v.ok) return;

    setSubmitting(true);
    try {
      await onSubmit({ rating, title: title.trim(), body: body.trim(), photos });
      setRating(5);
      setTitle("");
      setBody("");
      setPhotos([]);
      setVerdict(null);
      setSuccess(true);
    } catch (err) {
      setVerdict({
        ok: false,
        message:
          err instanceof Error ? err.message : "Couldn't post that review.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t border-[var(--border)]">
      <p className="eyebrow text-[var(--leaf)] mb-3">Write a review</p>

      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="p-0.5"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              className={n <= rating ? "text-[var(--leaf)]" : "text-[var(--border)]"}
            >
              <path
                d="M12 2.5l2.95 6.13 6.55.87-4.78 4.59 1.18 6.5L12 17.6l-6.0 2.99 1.18-6.5L2.5 9.5l6.55-.87L12 2.5z"
                fill="currentColor"
              />
            </svg>
          </button>
        ))}
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Headline"
        className="w-full mb-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[13.5px] focus:outline-none focus:border-[var(--leaf)]"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="What worked? What didn't?"
        className="w-full mb-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[13.5px] resize-none focus:outline-none focus:border-[var(--leaf)]"
      />

      <div className="mb-3">
        <label className="inline-flex items-center gap-2 text-[12px] text-[var(--leaf)] font-medium cursor-pointer">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
          + Add photos ({photos.length}/{MAX_PHOTOS})
        </label>
        {previews.length > 0 && (
          <ul className="flex items-center gap-2 mt-2 flex-wrap">
            {previews.map((url, i) => (
              <li key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover border border-[var(--border)]"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label="Remove photo"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--ink)] text-[var(--bg)] text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {verdict && !verdict.ok && (
        <p className="text-[12.5px] text-amber-700 mb-3 leading-snug">
          AI moderation flagged this — {verdict.message}
        </p>
      )}
      {success && (
        <p className="text-[12.5px] text-[var(--leaf)] mb-3 font-medium">
          Thanks — your review is in our moderation queue.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-[var(--ink)] text-[var(--bg)] py-2.5 text-[13.5px] font-medium hover:bg-[var(--leaf)] transition-colors disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}

export { moderateReview };
