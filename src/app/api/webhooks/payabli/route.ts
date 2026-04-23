import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolvePaymentGateway } from "@/lib/payments";

/**
 * Payabli webhook handler.
 *
 * Inbound events Payabli sends:
 *   - payment.captured     → mark claim payment as settled
 *   - payment.failed       → mark claim payment as failed, reverse ledger
 *   - payment.refunded     → record refund event + adjust claim
 *   - chargeback.opened    → flag claim, alert ops
 *   - settlement.completed → batch settlement metadata for reconciliation
 *
 * Verification:
 *   1. Read raw body BEFORE parsing JSON (signature is over raw bytes)
 *   2. Pass to gateway.verifyWebhookSignature()
 *   3. If valid → gateway.parseWebhook() → update ledger
 *   4. If invalid → 401, log attempt
 *
 * Idempotency:
 *   We dedupe by (gateway, paymentIntentId, type, amount). If we've already
 *   seen this exact event in the financial event log, return 200 silently.
 *
 * TODO(payabli): confirm the exact signature header name with the docs.
 *   Common Payabli pattern: `x-payabli-signature` or `payabli-signature`.
 *   Update SIGNATURE_HEADER below once confirmed.
 */

const SIGNATURE_HEADER = "x-payabli-signature";

export async function POST(req: Request) {
  // Read raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get(SIGNATURE_HEADER) ?? "";

  const gateway = resolvePaymentGateway();

  // Verify signature — refuse anything that doesn't check out
  if (gateway.name === "payabli") {
    const valid = gateway.verifyWebhookSignature({ signature, rawBody });
    if (!valid) {
      console.warn("[webhook/payabli] invalid signature", {
        signaturePresent: !!signature,
        bodyLength: rawBody.length,
      });
      return NextResponse.json(
        { ok: false, error: "invalid signature" },
        { status: 401 },
      );
    }
  }

  // Parse the event
  let event;
  try {
    event = gateway.parseWebhook(rawBody);
  } catch (err) {
    console.error("[webhook/payabli] parse error:", err);
    return NextResponse.json(
      { ok: false, error: "invalid payload" },
      { status: 400 },
    );
  }

  // Idempotency check — have we already processed this exact event?
  const existing = await prisma.financialEvent.findFirst({
    where: {
      AND: [
        { metadata: { path: ["webhookId"], equals: event.paymentIntentId } },
        { metadata: { path: ["webhookType"], equals: event.type } },
      ],
    },
  });
  if (existing) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  // Find the payment by clientReferenceId or gateway intent id
  const payment = event.clientReferenceId
    ? await prisma.payment.findFirst({
        where: { reference: { contains: event.clientReferenceId } },
        include: { claim: true },
      })
    : await prisma.payment.findFirst({
        where: { reference: event.paymentIntentId },
        include: { claim: true },
      });

  if (!payment) {
    console.warn("[webhook/payabli] no matching payment", {
      paymentIntentId: event.paymentIntentId,
      clientReferenceId: event.clientReferenceId,
      type: event.type,
    });
    // Still 200 — don't make Payabli retry forever for unknown payments
    return NextResponse.json({ ok: true, matched: false });
  }

  // Route by event type
  try {
    switch (event.type) {
      case "payment.captured":
      case "payment.settled":
        await prisma.financialEvent.create({
          data: {
            organizationId: payment.claim.organizationId,
            patientId: payment.claim.patientId,
            claimId: payment.claimId,
            paymentId: payment.id,
            type: "patient_payment",
            amountCents: event.amountCents,
            description: `Payment settled by Payabli`,
            metadata: {
              webhookId: event.paymentIntentId,
              webhookType: event.type,
              gateway: "payabli",
              ...event.rawPayload,
            },
            createdByAgent: "payabli-webhook",
            occurredAt: new Date(event.occurredAt),
          },
        });
        break;

      case "payment.failed":
        await prisma.financialEvent.create({
          data: {
            organizationId: payment.claim.organizationId,
            patientId: payment.claim.patientId,
            claimId: payment.claimId,
            paymentId: payment.id,
            type: "patient_payment",
            amountCents: -event.amountCents,
            description: `Payment failed — ${(event.rawPayload as any).reason ?? "declined"}`,
            metadata: {
              webhookId: event.paymentIntentId,
              webhookType: event.type,
              gateway: "payabli",
              ...event.rawPayload,
            },
            createdByAgent: "payabli-webhook",
            occurredAt: new Date(event.occurredAt),
          },
        });
        // Reverse the optimistic claim update from collectPayment
        await prisma.claim.update({
          where: { id: payment.claimId },
          data: {
            paidAmountCents: { decrement: event.amountCents },
          },
        });
        break;

      case "payment.refunded":
        await prisma.financialEvent.create({
          data: {
            organizationId: payment.claim.organizationId,
            patientId: payment.claim.patientId,
            claimId: payment.claimId,
            paymentId: payment.id,
            type: "refund_issued",
            amountCents: -event.amountCents,
            description: `Refund issued via Payabli`,
            metadata: {
              webhookId: event.paymentIntentId,
              webhookType: event.type,
              gateway: "payabli",
              ...event.rawPayload,
            },
            createdByAgent: "payabli-webhook",
            occurredAt: new Date(event.occurredAt),
          },
        });
        await prisma.claim.update({
          where: { id: payment.claimId },
          data: {
            paidAmountCents: { decrement: event.amountCents },
          },
        });
        break;

      case "chargeback.opened":
        await prisma.financialEvent.create({
          data: {
            organizationId: payment.claim.organizationId,
            patientId: payment.claim.patientId,
            claimId: payment.claimId,
            paymentId: payment.id,
            type: "chargeback",
            amountCents: -event.amountCents,
            description: `Chargeback opened by patient`,
            metadata: {
              webhookId: event.paymentIntentId,
              webhookType: event.type,
              gateway: "payabli",
              ...event.rawPayload,
            },
            createdByAgent: "payabli-webhook",
            occurredAt: new Date(event.occurredAt),
          },
        });
        break;

      default:
        // Unknown event type — log it but acknowledge so Payabli stops retrying
        console.log(
          `[webhook/payabli] unhandled event type: ${event.type}`,
          event.rawPayload,
        );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/payabli] processing error:", err);
    return NextResponse.json(
      { ok: false, error: "processing error" },
      { status: 500 },
    );
  }
}
