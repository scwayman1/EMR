// EMR-305 — POST /api/leafmart/products/[slug]/questions
//
// Accept a customer question for a PDP. Runs the cheap pre-moderation
// gate before the heavier AI moderation pass (review-moderation.ts).
// On success, returns a placeholder shape that the client uses to
// reconcile its optimistic insert.

import { NextResponse } from "next/server";
import { z } from "zod";
import { preModerateQuestion } from "@/lib/marketplace/qa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  authorName: z.string().min(1).max(80),
  body: z.string().min(1).max(2000),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const result = preModerateQuestion({
    productSlug: slug,
    authorName: parsed.data.authorName,
    body: parsed.data.body,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "rejected", reasons: result.reasons },
      { status: 422 },
    );
  }

  // Persistence is wired by the storefront DB story (EMR-305 backend).
  // Today we acknowledge the optimistic id; the row will land once the
  // ProductQuestion table ships.
  return NextResponse.json({ id: result.id, status: "pending_moderation" });
}
