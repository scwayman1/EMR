"use client";

import { useMemo, useState } from "react";
import type { LeafmartReview } from "./LeafmartProductCard";
import { StarRating } from "./StarRating";

interface Props {
  reviews: LeafmartReview[];
  averageRating: number;
  reviewCount: number;
}

type SortMode = "most-helpful" | "newest" | "highest" | "lowest";

const SORTS: Array<{ id: SortMode; label: string }> = [
  { id: "most-helpful", label: "Most helpful" },
  { id: "newest", label: "Newest" },
  { id: "highest", label: "Highest rated" },
  { id: "lowest", label: "Lowest rated" },
];

export function ProductReviews({ reviews, averageRating, reviewCount }: Props) {
  const [sort, setSort] = useState<SortMode>("most-helpful");
  const [showAll, setShowAll] = useState(false);

  const distribution = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0]; // index 0 = 1-star … index 4 = 5-star
    for (const r of reviews) {
      const idx = Math.max(0, Math.min(4, Math.round(r.rating) - 1));
      buckets[idx] += 1;
    }
    return buckets;
  }, [reviews]);

  const sorted = useMemo(() => {
    const list = [...reviews];
    switch (sort) {
      case "newest":
        return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      case "highest":
        return list.sort((a, b) => b.rating - a.rating);
      case "lowest":
        return list.sort((a, b) => a.rating - b.rating);
      case "most-helpful":
      default:
        // No helpfulness score in the data model yet — proxy with verified +
        // body-length so substantive reviews surface first.
        return list.sort((a, b) => {
          const score = (r: LeafmartReview) =>
            (r.verified ? 100 : 0) + (r.body?.length ?? 0) / 10 + r.rating;
          return score(b) - score(a);
        });
    }
  }, [reviews, sort]);

  const visible = showAll ? sorted : sorted.slice(0, 3);
  const showSummary = reviewCount > 0 || reviews.length > 0;

  if (!showSummary && reviews.length === 0) return null;

  const totalKnown = reviews.length || reviewCount;
  const max = Math.max(1, ...distribution);

  return (
    <section className="px-4 sm:px-6 lg:px-14 py-10 sm:py-12 max-w-[1440px] mx-auto border-t border-[var(--border)]">
      <div className="mb-6 sm:mb-8">
        <p className="eyebrow text-[var(--leaf)] mb-2">What patients say</p>
        <h2 className="font-display text-[26px] sm:text-[32px] font-normal tracking-tight text-[var(--ink)]">
          Reviews
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 sm:gap-12">
        {/* Summary */}
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
          </p>

          {/* Distribution */}
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
        </div>

        {/* List */}
        <div>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <p className="text-[13px] text-[var(--muted)]">
              Showing {visible.length} of {reviews.length}
            </p>
            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] p-1 bg-[var(--surface)]">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={`px-3 py-1.5 rounded-full text-[11.5px] font-medium transition-colors ${
                    sort === s.id
                      ? "bg-[var(--ink)] text-[#FFF8E8]"
                      : "text-[var(--text-soft)] hover:text-[var(--ink)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-[13px] text-[var(--muted)]">
              No written reviews yet. Be the first to share your experience.
            </div>
          ) : (
            <ul className="space-y-4">
              {visible.map((r) => (
                <ReviewCard key={r.id} review={r} />
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
    </section>
  );
}

function ReviewCard({ review }: { review: LeafmartReview }) {
  const date = new Date(review.createdAt);
  const dateLabel = isNaN(+date)
    ? review.createdAt
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
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
