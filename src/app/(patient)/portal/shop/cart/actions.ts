"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export interface ServerCartItem {
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
  name: string;
}

// Resolve the patient row for the current user. Returns null for non-patient
// sessions (e.g. clinicians browsing the portal) — caller treats as "no cart".
async function resolvePatientId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const patient = await prisma.patient.findFirst({
    where: { userId: user.id, organizationId: user.organizationId ?? "" },
    select: { id: true },
  });
  return patient?.id ?? null;
}

async function getOrCreateCart(patientId: string) {
  return prisma.cart.upsert({
    where: { patientId },
    update: {},
    create: { patientId },
    select: { id: true },
  });
}

function hydrate(
  item: {
    productId: string;
    variantId: string | null;
    quantity: number;
    product: { name: string; price: number };
    variant: { price: number } | null;
  },
): ServerCartItem {
  return {
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    price: item.variant?.price ?? item.product.price,
    name: item.product.name,
  };
}

export async function getServerCart(): Promise<ServerCartItem[]> {
  const patientId = await resolvePatientId();
  if (!patientId) return [];
  const cart = await prisma.cart.findUnique({
    where: { patientId },
    include: {
      items: {
        include: {
          product: { select: { name: true, price: true } },
          variant: { select: { price: true } },
        },
      },
    },
  });
  if (!cart) return [];
  return cart.items.map(hydrate);
}

export async function setCartItemQuantity(
  productId: string,
  variantId: string | null,
  quantity: number,
): Promise<ServerCartItem[]> {
  const patientId = await resolvePatientId();
  if (!patientId) return [];

  if (quantity <= 0) {
    return removeCartItem(productId, variantId);
  }

  const cart = await getOrCreateCart(patientId);

  // Prisma's compound-key `where` clause on `cartId_productId_variantId`
  // rejects null for `variantId` at the type level, so we do the upsert by
  // hand: find existing row, update its quantity; otherwise create.
  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantId },
    select: { id: true },
  });
  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, variantId, quantity },
    });
  }

  return getServerCart();
}

export async function removeCartItem(
  productId: string,
  variantId: string | null,
): Promise<ServerCartItem[]> {
  const patientId = await resolvePatientId();
  if (!patientId) return [];
  const cart = await prisma.cart.findUnique({
    where: { patientId },
    select: { id: true },
  });
  if (!cart) return [];
  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id, productId, variantId },
  });
  return getServerCart();
}

export async function clearServerCart(): Promise<void> {
  const patientId = await resolvePatientId();
  if (!patientId) return;
  const cart = await prisma.cart.findUnique({
    where: { patientId },
    select: { id: true },
  });
  if (!cart) return;
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}
