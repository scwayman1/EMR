"use client";

// EMR-306 — Review submission form with photo uploads.
//
// Uploads run as multipart/form-data. The server route hands each photo
// off to the moderation pipeline (review-moderation.ts). This form does
// the cheap client-side gating (size, mime, count) so users get feedback
// before bytes leave their machine.

import { useState, useCallback } from "react";
import { StarRating } from "./StarRating";

interface Props {
  productSlug: string;
  onClose: () => void;
}

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
}

export function ReviewSubmissionForm({ productSlug, onClose }: Props) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const next: PendingPhoto[] = [...photos];
      for (const file of Array.from(files)) {
        if (next.length >= MAX_PHOTOS) {
          setError(`Up to ${MAX_PHOTOS} photos per review.`);
          break;
        }
        if (!ALLOWED_MIME.includes(file.type)) {
          setError(`Photos must be JPEG, PNG, or WebP. Got ${file.type}.`);
          continue;
        }
        if (file.size > MAX_PHOTO_BYTES) {
          setError(`${file.name} is over 8MB.`);
          continue;
        }
        next.push({
          id: `pending-${Date.now()}-${file.name}`,
          file,
          previewUrl: URL.createObjectURL(file),
          caption: "",
        });
      }
      setPhotos(next);
    },
    [photos],
  );

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const updateCaption = useCallback((id: string, caption: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caption } : p)),
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (body.trim().length < 20) {
      setError("Reviews must be at least 20 characters.");
      return;
    }
    if (!author.trim()) {
      setError("Add your name.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("authorName", author.trim());
      fd.set("rating", String(rating));
      fd.set("title", title.trim());
      fd.set("body", body.trim());
      photos.forEach((p, i) => {
        fd.append(`photo_${i}`, p.file, p.file.name);
        fd.append(`caption_${i}`, p.caption.trim());
      });

      const res = await fetch(`/api/leafmart/products/${productSlug}/reviews`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Could not submit review.");
        return;
      }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] p-6">
        <p className="eyebrow text-[var(--leaf)] mb-2">Thanks for your review</p>
        <p className="text-[14px] text-[var(--text)] mb-4">
          We screen every review for medical claims and image quality. You&apos;ll
          see it on this page once moderation clears.
        </p>
        <button
          onClick={onClose}
          className="text-[13px] font-medium text-[var(--leaf)] hover:underline"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] p-5 sm:p-6"
    >
      <p className="eyebrow text-[var(--leaf)] mb-3">Write a review</p>

      <label className="block text-[12.5px] text-[var(--muted)] mb-2">
        Your rating
      </label>
      <div className="flex items-center gap-1.5 mb-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className="p-0.5"
            aria-label={`${n} stars`}
          >
            <StarRating rating={n <= rating ? 5 : 0} size={22} />
          </button>
        ))}
        <span className="text-[12.5px] text-[var(--muted)] ml-2 tabular-nums">
          {rating}/5
        </span>
      </div>

      <input
        type="text"
        placeholder="Your name"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        className="w-full mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[14px]"
      />
      <input
        type="text"
        placeholder="Headline (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[14px]"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What did you experience? What worked, what didn't?"
        rows={4}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[14px] resize-y mb-4"
      />

      <label className="block text-[12.5px] text-[var(--muted)] mb-2">
        Add photos ({photos.length}/{MAX_PHOTOS})
      </label>
      <input
        type="file"
        multiple
        accept={ALLOWED_MIME.join(",")}
        onChange={(e) => handleFiles(e.target.files)}
        className="block text-[13px] mb-3"
      />
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {photos.map((p) => (
            <li
              key={p.id}
              className="rounded-lg overflow-hidden bg-[var(--surface)] border border-[var(--border)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.previewUrl}
                alt="Review photo preview"
                className="w-full h-28 object-cover"
              />
              <div className="p-2 space-y-2">
                <input
                  type="text"
                  placeholder="Caption (optional)"
                  value={p.caption}
                  onChange={(e) => updateCaption(p.id, e.target.value)}
                  className="w-full rounded border border-[var(--border)] px-2 py-1 text-[12px]"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(p.id)}
                  className="text-[11.5px] text-rose-700 hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-[12px] text-rose-700 mb-3">{error}</p>
      )}

      <div className="flex items-center justify-between mt-2 flex-wrap gap-3">
        <p className="text-[11.5px] text-[var(--muted)] max-w-md">
          We screen for medical claims and inappropriate imagery. Reviews appear
          once approved.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-[13px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-[var(--ink)] text-[var(--bg)] px-5 py-2 text-[13px] font-medium hover:bg-[var(--leaf)] transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit review"}
          </button>
        </div>
      </div>
    </form>
  );
}
