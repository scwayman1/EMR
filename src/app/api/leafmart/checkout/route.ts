/**
 * POST /api/leafmart/checkout
 *
 * Validates a cart, runs it through the configured payment gateway, and
 * persists an Order + OrderItems on success. Raw card data is never
 * accepted — the browser must already have an opaque payment-method
 * token (Stripe / Payabli) or be in stub mode.
 *
 * Auth: required. Uses getCurrentUser() so the route works under both
 * iron-session (current default) and Clerk (when AUTH_PROVIDER=clerk).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { createPaymentIntent, confirmPayment, getActiveGateway } from "@/lib/leafmart/payment";
import {
  ensureLeafmartOrganization,
  ensurePatientForUser,
  ensureProductsForLeafmart,
} from "@/lib/leafmart/sync";
import { checkShippingRestriction } from "@/lib/marketplace/shipping-restrictions";
import { recordEventAsync } from "@/lib/marketplace/event-recorder";
import { resolveCartAgeGate } from "@/server/marketplace/age-gate";
import { calculateSalesTax } from "@/lib/leafmart/taxjar/client";

const ItemSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  partner: z.string().min(1),
  format: z.string().min(1),
  formatLabel: z.string().min(1),
  support: z.string().default(""),
  dose: z.string().default(""),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  // visual hints — passed back so re-rendering after order creation works
  shape: z.string(),
  bg: z.string(),
  deep: z.string(),
  pct: z.number().optional(),
  n: z.number().optional(),
  tag: z.string().optional(),
});

const BodySchema = z.object({
  contact: z.object({
    email: z.string().email(),
    phone: z.string().min(7),
  }),
  shipping: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    address1: z.string().min(1),
    address2: z.string().optional().default(""),
    city: z.string().min(1),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/),
  }),
  items: z.array(ItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  total: z.number().nonnegative(),
  /** Provider-side payment intent id from a prior createPaymentIntent call.
   *  Optional in stub mode — we'll mint one on the fly. */
  paymentIntentId: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to check out." },
      { status: 401 },
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid checkout payload", detail: (err as Error).message },
      { status: 400 },
    );
  }

  // Server-side recompute of totals — never trust the client.
  const computedSubtotal = body.items.reduce(
    (s, it) => s + it.price * it.quantity,
    0,
  );

  // EMR-247: authoritative sales tax via TaxJar (or stub fallback when
  // TAXJAR_API_KEY isn't set — same flat 8.75% as the cart UI uses, so
  // totals match dev/CI). Tax money never enters vendor payout flow —
  // it's tracked separately on the Order ledger.
  const taxResult = await calculateSalesTax({
    shippingAddress: {
      state: body.shipping.state,
      zip: body.shipping.zip,
      city: body.shipping.city,
    },
    subtotalUsd: computedSubtotal,
    shippingUsd: 0,
    lineItems: body.items.map((it) => ({
      id: it.slug,
      quantity: it.quantity,
      unitPriceUsd: it.price,
    })),
  });
  const computedTax = taxResult.totalTaxUsd;
  const computedTotal = Math.round((computedSubtotal + computedTax) * 100) / 100;

  // Tolerate ±1¢ rounding drift between client and server.
  if (Math.abs(computedTotal - body.total) > 0.02) {
    return NextResponse.json(
      {
        error: "Cart totals don't match server calculation. Refresh and try again.",
        expected: computedTotal,
        received: body.total,
      },
      { status: 422 },
    );
  }

  // EMR-244: state shipping restriction matrix. Look up vendors by name
  // (until EMR-268 wires the FK) and reject the order if any cart item's
  // vendor doesn't permit the destination state. Items whose partner
  // doesn't resolve to a marketplace Vendor are allowed through — those
  // are demo-catalog brands not yet onboarded; the FK bridge in EMR-268
  // closes that loophole.
  const partnerNames = Array.from(new Set(body.items.map((it) => it.partner)));
  const matchedVendors = await prisma.vendor.findMany({
    where: { name: { in: partnerNames } },
    select: { name: true, shippableStates: true },
  });
  const vendorByName = new Map(matchedVendors.map((v) => [v.name, v]));
  const blocked = body.items
    .map((it) => {
      const vendor = vendorByName.get(it.partner);
      if (!vendor) return null;
      const result = checkShippingRestriction(vendor, body.shipping.state);
      if (result.ok) return null;
      return { slug: it.slug, name: it.name, partner: it.partner, reason: result.reason, message: result.message };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  if (blocked.length > 0) {
    return NextResponse.json(
      {
        error: `Some items in your cart can't ship to ${body.shipping.state.toUpperCase()}.`,
        blocked,
      },
      { status: 422 },
    );
  }

  // Bridge the demo cart into the EMR tables so OrderItem FKs resolve.
  // Run before payment so we can enforce age gating without charging
  // a card that we'll then refuse to ship against. Upserts are idempotent.
  const org = await ensureLeafmartOrganization();
  const patient = await ensurePatientForUser(user, org.id);
  const productMap = await ensureProductsForLeafmart(
    body.items.map((it) => ({
      slug: it.slug,
      name: it.name,
      partner: it.partner,
      format: it.format,
      formatLabel: it.formatLabel,
      support: it.support,
      dose: it.dose,
      price: it.price,
      pct: it.pct ?? 0,
      n: it.n ?? 0,
      bg: it.bg,
      deep: it.deep,
      // shape is constrained on the client but typed loosely here; the
      // sync layer doesn't store it, so any string is fine.
      shape: it.shape as never,
      tag: it.tag,
    })),
    org.id,
  );

  // EMR-245: server-side 21+ enforcement. The patient-portal PDP collects
  // DOB once via /api/marketplace/age-gate/confirm; this is the boundary
  // that catches anyone who reached checkout without going through that
  // flow (e.g., a bug, a bypassed UI, or an API client).
  const patientAge = await prisma.patient.findUnique({
    where: { id: patient.id },
    select: { dateOfBirth: true, ageVerifiedAt: true },
  });
  const ageGateResult = resolveCartAgeGate({
    items: body.items.map((it) => {
      const product = productMap.get(it.slug);
      return {
        productSlug: it.slug,
        productName: it.name,
        requires21Plus: product?.requires21Plus ?? false,
      };
    }),
    isAuthenticated: true,
    dateOfBirth: patientAge?.dateOfBirth ?? null,
    ageVerifiedAt: patientAge?.ageVerifiedAt ?? null,
    destinationState: body.shipping.state,
  });
  if (!ageGateResult.ok) {
    return NextResponse.json(
      {
        error: "21+ age verification is required to purchase some items in your cart.",
        ageBlocked: ageGateResult.blocked.map((b) => ({
          slug: b.item.productSlug,
          name: b.item.productName,
          status: b.decision.status,
          message: b.decision.message,
        })),
      },
      { status: 422 },
    );
  }

  // Run payment after the gating checks so we never charge a card we
  // can't ship against.
  let intentId = body.paymentIntentId;
  if (!intentId) {
    const intent = await createPaymentIntent(computedTotal, "usd");
    intentId = intent.intentId;
  }
  const result = await confirmPayment(intentId);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Payment was declined." },
      { status: 402 },
    );
  }

  const order = await prisma.order.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      status: "confirmed",
      subtotal: computedSubtotal,
      tax: computedTax,
      total: computedTotal,
      shippingAddress: {
        ...body.shipping,
        contactEmail: body.contact.email,
        contactPhone: body.contact.phone,
      },
      notes: `gateway:${getActiveGateway()} txn:${result.transactionId} tax_source:${taxResult.source} tax_state:${taxResult.jurisdictions.state} tax_rate:${taxResult.rate}`,
      items: {
        create: body.items.map((it) => {
          const product = productMap.get(it.slug);
          if (!product) throw new Error(`Product ${it.slug} failed to upsert`);
          return {
            productId: product.id,
            quantity: it.quantity,
            unitPrice: it.price,
            totalPrice: it.price * it.quantity,
          };
        }),
      },
    },
    include: { items: true },
  });

  // EMR-238: emit one purchase event per line item so the ranking
  // engine attributes outcomes per product. Fire-and-forget — a
  // recorder failure must not break checkout.
  for (const it of body.items) {
    const product = productMap.get(it.slug);
    if (!product) continue;
    recordEventAsync({
      organizationId: org.id,
      patientId: patient.id,
      productId: product.id,
      vendorId: null,
      eventType: "purchase",
      metadata: {
        orderId: order.id,
        slug: it.slug,
        quantity: it.quantity,
        unitPrice: it.price,
      },
    });
  }

  return NextResponse.json({
    orderId: order.id,
    orderNumber: `LM-${order.id.slice(-8).toUpperCase()}`,
    transactionId: result.transactionId,
    gateway: getActiveGateway(),
  });
}
