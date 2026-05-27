// EMR-247 — sales tax calculation endpoint.
//
// Cart UI calls this when the buyer enters their shipping address to
// show the tax line item before they hit "Pay". The same logic runs
// server-side at checkout (route below) to authoritatively compute
// the tax that goes on the order — never trust the cart's pre-flight
// number for the actual charge.

import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateSalesTax } from "@/lib/leafmart/taxjar/client";

export const runtime = "nodejs";

const Schema = z.object({
  shippingAddress: z.object({
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/),
    city: z.string().optional(),
  }),
  subtotalUsd: z.number().nonnegative(),
  shippingUsd: z.number().nonnegative().default(0),
  lineItems: z
    .array(
      z.object({
        id: z.string().optional(),
        quantity: z.number().int().positive(),
        unitPriceUsd: z.number().nonnegative(),
        productTaxCode: z.string().optional(),
      }),
    )
    .optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_payload", detail: (err as Error).message },
      { status: 400 },
    );
  }

  try {
    const result = await calculateSalesTax(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: "tax_calculation_failed", detail: (err as Error).message },
      { status: 502 },
    );
  }
}
