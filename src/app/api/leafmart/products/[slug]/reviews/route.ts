// EMR-306 — POST /api/leafmart/products/[slug]/reviews
//
// Accepts multipart form data with the review body and 0..N photos.
// Runs the moderation pipeline (review-moderation.ts) and returns the
// final verdict so the client can show the right confirmation copy.

import { NextResponse } from "next/server";
import {
  moderateReviewFully,
  type ReviewSubmission,
  type ReviewPhoto,
} from "@/lib/marketplace/review-moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PHOTOS = 6;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const authorName = String(form.get("authorName") ?? "").trim();
  const ratingRaw = Number(form.get("rating"));
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();

  // Photos arrive as photo_0..photo_N; captions as caption_0..caption_N.
  const photos: ReviewPhoto[] = [];
  for (let i = 0; i < MAX_PHOTOS; i++) {
    const file = form.get(`photo_${i}`);
    if (!(file instanceof File)) break;
    const caption = String(form.get(`caption_${i}`) ?? "").trim() || undefined;
    photos.push({
      id: `photo-${slug}-${i}-${Date.now()}`,
      // The real storage handoff (envelope-encrypt + upload) is owned by
      // the photo storage worker; we only carry the metadata into the
      // moderator. The handoff lands when the storage backend is wired in.
      storageKey: `pending/${slug}/${i}-${file.name}`,
      mimeType: file.type,
      sizeBytes: file.size,
      caption,
    });
  }

  const submission: ReviewSubmission = {
    productSlug: slug,
    authorName,
    rating: ratingRaw,
    title: title || undefined,
    body,
    photos,
  };

  const result = await moderateReviewFully(submission);

  if (result.verdict === "rejected") {
    return NextResponse.json(
      { verdict: result.verdict, reasons: result.reasons },
      { status: 422 },
    );
  }

  return NextResponse.json({
    verdict: result.verdict,
    reasons: result.reasons,
    photoFlags: result.photoFlags,
  });
}
