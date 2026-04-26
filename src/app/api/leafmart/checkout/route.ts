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
  const computedTax = Math.round(computedSubtotal * 0.0875 * 100) / 100;
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

  // Run payment first so we don't write an Order for a declined card.
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

  // Bridge the demo cart into the EMR tables so OrderItem FKs resolve.
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
      notes: `gateway:${getActiveGateway()} txn:${result.transactionId}`,
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

  return NextResponse.json({
    orderId: order.id,
    orderNumber: `LM-${order.id.slice(-8).toUpperCase()}`,
    transactionId: result.transactionId,
    gateway: getActiveGateway(),
  });
}
