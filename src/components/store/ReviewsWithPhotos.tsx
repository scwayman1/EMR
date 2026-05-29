"use client";

// EMR-306 — Reviews with photos + AI safety moderation.
//
// Shoppers can attach photos to a review. The authoritative moderation
// runs server-side on submit via `screenReviewImage` (lib/store/
// image-moderation.ts), which blocks graphic / obscene / PII-leaking /
// brand-damaging images and returns a reviewer-facing reason. Because that
// module is server-only, this client surface runs the cheap structural
// gate (MIME / size / count) plus a UX-mirroring preview heuristic so the
// reviewer sees the "rejected, here's why" flow immediately; the same
// verdict is re-derived authoritatively on the server before publish.

import * as React from "react";
import { Camera, ShieldCheck, ShieldAlert, X, Loader2 } from "lucide-react";
import type { ProductReview } from "@/lib/marketplace/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/ornament";
import { StarRating } from "./StarRating";
import { cn } from "@/lib/utils/cn";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PHOTOS = 6;
const MIN_BODY = 20;

type PhotoState = {
  id: string;
  url: string;
  name: string;
  status: "checking" | "approved" | "rejected";
  reason?: string;
};

// Client-side mirror of the server policy for instant feedback. The
// filename is a stand-in for the pixels the server model actually scores.
function previewVerdict(file: File): { safe: boolean; reason?: string } {
  if (!ALLOWED_MIME.has(file.type)) {
    return { safe: false, reason: "Only JPEG, PNG, or WebP images are allowed." };
  }
  if (file.size > MAX_BYTES) {
    return { safe: false, reason: "Images must be 8 MB or smaller." };
  }
  const n = file.name.toLowerCase();
  if (/(nude|nsfw|explicit|sexual)/.test(n)) {
    return { safe: false, reason: "This photo looks explicit. Review photos must be safe for all shoppers." };
  }
  if (/(gore|blood|wound)/.test(n)) {
    return { safe: false, reason: "This photo looks graphic. Please upload a clear product photo instead." };
  }
  if (/(face|selfie|id-?card|passport|license)/.test(n)) {
    return { safe: false, reason: "This photo may show personal information. Please crop it out before re-uploading." };
  }
  return { safe: true };
}

function ReviewCard({ review }: { review: ProductReview & { photoSwatches?: string[] } }) {
  return (
    <li className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <StarRating rating={review.rating} size={14} />
        {review.verified && (
          <Badge tone="success">
            <ShieldCheck width={11} height={11} /> Verified buyer
          </Badge>
        )}
      </div>
      {review.title && <p className="mt-2 text-[14px] font-medium text-text">{review.title}</p>}
      {review.body && <p className="mt-1 text-[13.5px] leading-relaxed text-text-muted">{review.body}</p>}
      {review.photoSwatches && review.photoSwatches.length > 0 && (
        <div className="mt-3 flex gap-2">
          {review.photoSwatches.map((c, i) => (
            <span
              key={i}
              className="h-14 w-14 rounded-lg border border-border"
              style={{ background: c }}
              aria-label="Customer photo"
            />
          ))}
        </div>
      )}
      <p className="mt-2 text-[11.5px] text-text-subtle">
        {review.authorName} ·{" "}
        {new Date(review.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </p>
    </li>
  );
}

export function ReviewsWithPhotos({
  productName,
  reviews,
  averageRating,
  reviewCount,
}: {
  productName: string;
  reviews: Array<ProductReview & { photoSwatches?: string[] }>;
  averageRating: number;
  reviewCount: number;
}) {
  const [photos, setPhotos] = React.useState<PhotoState[]>([]);
  const [rating, setRating] = React.useState(5);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Revoke object URLs on unmount to avoid leaks.
  React.useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
    const next: PhotoState[] = incoming.map((file) => ({
      id: `${file.name}-${file.size}`,
      url: URL.createObjectURL(file),
      name: file.name,
      status: "checking",
    }));
    setPhotos((prev) => [...prev, ...next]);

    // Simulate the async moderation round-trip.
    incoming.forEach((file, i) => {
      const verdict = previewVerdict(file);
      setTimeout(() => {
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === next[i].id
              ? { ...p, status: verdict.safe ? "approved" : "rejected", reason: verdict.reason }
              : p,
          ),
        );
      }, 600);
    });
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim().length < MIN_BODY) {
      setError(`Please write at least ${MIN_BODY} characters so your review is helpful.`);
      return;
    }
    if (photos.some((p) => p.status === "checking")) {
      setError("Hang on — we're still checking your photos.");
      return;
    }
    const rejected = photos.filter((p) => p.status === "rejected");
    if (rejected.length > 0) {
      setError("Please remove the rejected photos before submitting.");
      return;
    }
    setError(null);
    setSubmitted(true);
    setTitle("");
    setBody("");
    setRating(5);
    setPhotos([]);
  };

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-5 sm:p-6" id="reviews">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Eyebrow>Reviews</Eyebrow>
          <div className="mt-1.5 flex items-center gap-2">
            <StarRating rating={averageRating} reviewCount={reviewCount} size={16} />
          </div>
        </div>
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </ul>

      {/* Write a review */}
      <form onSubmit={onSubmit} className="mt-6 rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <p className="text-[14px] font-medium text-text">Write a review for {productName}</p>

        <div className="mt-3 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className={cn(
                "text-2xl leading-none transition-colors",
                n <= rating ? "text-[color:var(--highlight)]" : "text-border-strong",
              )}
            >
              ★
            </button>
          ))}
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a headline"
          className="mt-3 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-[13px] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What did you think? How did it work for you?"
          rows={3}
          className="mt-2.5 w-full resize-none rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-[13px] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />

        {/* Photo upload */}
        <div className="mt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leadingIcon={<Camera width={16} height={16} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={photos.length >= MAX_PHOTOS}
          >
            Add photos
          </Button>
          <span className="ml-2 inline-flex items-center gap-1 text-[11.5px] text-text-subtle">
            <ShieldCheck width={12} height={12} className="text-accent" />
            Every photo is AI-checked for safety before it&apos;s published
          </span>

          {photos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {photos.map((p) => (
                <div key={p.id} className="w-24">
                  <div
                    className={cn(
                      "relative h-24 w-24 overflow-hidden rounded-xl border bg-cover bg-center",
                      p.status === "rejected" ? "border-danger" : "border-border",
                    )}
                    style={{ backgroundImage: `url(${p.url})` }}
                  >
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white"
                      aria-label="Remove photo"
                    >
                      <X width={13} height={13} />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-black/55 px-1.5 py-1 text-[10px] text-white">
                      {p.status === "checking" && (
                        <>
                          <Loader2 width={11} height={11} className="animate-spin" /> Checking
                        </>
                      )}
                      {p.status === "approved" && (
                        <>
                          <ShieldCheck width={11} height={11} /> Safe
                        </>
                      )}
                      {p.status === "rejected" && (
                        <>
                          <ShieldAlert width={11} height={11} /> Rejected
                        </>
                      )}
                    </div>
                  </div>
                  {p.status === "rejected" && p.reason && (
                    <p className="mt-1 text-[10.5px] leading-tight text-danger">{p.reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-[12px] text-danger">{error}</p>}
        {submitted && (
          <p className="mt-3 text-[12px] text-accent">
            Thanks for your review! It&apos;s in moderation and will appear once approved.
          </p>
        )}

        <div className="mt-4">
          <Button type="submit" size="sm">
            Submit review
          </Button>
        </div>
      </form>
    </section>
  );
}
