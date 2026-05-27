/**
 * Leafmart order queries — server-only.
 *
 * The storefront uses these from server components on /leafmart/account/*.
 * They scope every read to (a) the patient row owned by the authed User
 * and (b) the "leafmart" organization, so a customer can never see an
 * order from a clinic they happen to also be a patient of.
 */

import "server-only";
import { prisma } from "@/lib/db/prisma";
import { LEAFMART_ORG_SLUG } from "@/lib/leafmart/sync";
import type { Order, OrderItem, Product } from "@prisma/client";

export type LeafmartOrder = Order & {
  items: (OrderItem & { product: Product })[];
};

export interface LeafmartShippingAddress {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  contactEmail?: string;
  contactPhone?: string;
}

export function formatOrderNumber(orderId: string): string {
  return `LM-${orderId.slice(-8).toUpperCase()}`;
}

async function leafmartOrgId(): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { slug: LEAFMART_ORG_SLUG },
    select: { id: true },
  });
  return org?.id ?? null;
}

export async function getOrdersByUser(userId: string): Promise<LeafmartOrder[]> {
  const orgId = await leafmartOrgId();
  if (!orgId) return [];

  const patient = await prisma.patient.findFirst({
    where: { userId, organizationId: orgId },
    select: { id: true },
  });
  if (!patient) return [];

  return prisma.order.findMany({
    where: { patientId: patient.id, organizationId: orgId },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderByIdForUser(
  orderId: string,
  userId: string,
): Promise<LeafmartOrder | null> {
  const orgId = await leafmartOrgId();
  if (!orgId) return null;

  const patient = await prisma.patient.findFirst({
    where: { userId, organizationId: orgId },
    select: { id: true },
  });
  if (!patient) return null;

  return prisma.order.findFirst({
    where: { id: orderId, patientId: patient.id, organizationId: orgId },
    include: { items: { include: { product: true } } },
  });
}

export async function getOrderStatsForUser(userId: string): Promise<{
  ordersCount: number;
  productsTried: number;
  totalSpent: number;
}> {
  const orders = await getOrdersByUser(userId);
  const productSlugs = new Set<string>();
  let totalSpent = 0;
  for (const o of orders) {
    totalSpent += o.total;
    for (const it of o.items) productSlugs.add(it.product.slug);
  }
  return {
    ordersCount: orders.length,
    productsTried: productSlugs.size,
    totalSpent,
  };
}
