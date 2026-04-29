// EMR-310 — POST /api/leafmart/cart/share
//
// Encodes the supplied cart into a signed share token and returns the
// URL the customer can copy/text/email. The HMAC secret never leaves
// the server; clients only see the URL.

import { NextResponse } from "next/server";
import { z } from "zod";
import { buildShareUrl, type SharePayload } from "@/lib/marketplace/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(25),
  from: z.string().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const payload: SharePayload = {
    iat: new Date().toISOString(),
    items: parsed.data.items,
    from: parsed.data.from,
  };

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    new URL(req.url).origin;

  try {
    const url = buildShareUrl({ baseUrl, payload });
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: "could_not_encode" },
      { status: 422 },
    );
  }
}
