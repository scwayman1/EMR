/**
 * Sync helpers that bridge the Leafmart storefront (which lives on
 * client-side demo data) with the EMR's Prisma schema.
 *
 * Three concerns, all idempotent:
 *
 *   1. The "leafmart" Organization — every Order requires an organizationId
 *      FK. We pin it to slug "leafmart" so all storefront orders bucket
 *      together regardless of which clinic the buyer might also belong to.
 *
 *   2. The buyer's Patient row — Order.patientId is a Patient FK, not a
 *      User FK. Leafmart users may have signed up via Clerk but never
 *      visited the EMR; on first checkout we materialize a Patient under
 *      the "leafmart" org keyed by their User id.
 *
 *   3. Product rows for the demo catalog — OrderItem.productId is a FK to
 *      Product. The Leafmart cart carries DEMO_PRODUCTS objects (slug-keyed,
 *      no DB row), so we upsert by slug on first checkout. Once a real
 *      Product table is seeded these calls become no-ops.
 */

import type { Patient, Organization, Product } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { LeafmartProduct } from "@/components/leafmart/LeafmartProductCard";
import type { AuthedUser } from "@/lib/auth/session";

export const LEAFMART_ORG_SLUG = "leafmart";

export async function ensureLeafmartOrganization(): Promise<Organization> {
  const existing = await prisma.organization.findUnique({
    where: { slug: LEAFMART_ORG_SLUG },
  });
  if (existing) return existing;
  return prisma.organization.create({
    data: { name: "Leafmart Marketplace", slug: LEAFMART_ORG_SLUG },
  });
}

export async function ensurePatientForUser(
  user: AuthedUser,
  organizationId: string,
): Promise<Patient> {
  const existing = await prisma.patient.findFirst({
    where: { userId: user.id, organizationId },
  });
  if (existing) return existing;
  return prisma.patient.create({
    data: {
      userId: user.id,
      organizationId,
      firstName: user.firstName || "Leafmart",
      lastName: user.lastName || "Customer",
      email: user.email,
    },
  });
}

/**
 * Idempotently upsert a Product row from a LeafmartProduct.
 * Falls back to ad-hoc demo defaults for fields the storefront doesn't
 * track (THC content, terpenes, etc.).
 */
export async function ensureProductForLeafmart(
  source: LeafmartProduct,
  organizationId: string,
): Promise<Product> {
  return prisma.product.upsert({
    where: { slug: source.slug },
    update: {
      name: source.name,
      price: source.price,
      brand: source.partner,
      format: source.format,
    },
    create: {
      slug: source.slug,
      name: source.name,
      price: source.price,
      brand: source.partner,
      description: source.support,
      shortDescription: source.support,
      format: source.format,
      organizationId,
      status: "active",
      labVerified: true,
      clinicianPick: source.tag === "Clinician Pick",
    },
  });
}

export async function ensureProductsForLeafmart(
  sources: LeafmartProduct[],
  organizationId: string,
): Promise<Map<string, Product>> {
  const out = new Map<string, Product>();
  for (const src of sources) {
    const product = await ensureProductForLeafmart(src, organizationId);
    out.set(src.slug, product);
  }
  return out;
}
