/**
 * Leafmart shipping-address helpers — server-only.
 *
 * Wraps prisma.shippingAddress with leafmart-org scoping and a
 * single-default invariant: only one address per patient can have
 * isDefault === true at a time.
 */

import "server-only";
import { prisma } from "@/lib/db/prisma";
import { ensureLeafmartOrganization, ensurePatientForUser } from "@/lib/leafmart/sync";
import type { AuthedUser } from "@/lib/auth/session";
import type { ShippingAddress } from "@prisma/client";

export type LeafmartShippingAddressRow = ShippingAddress;

export interface ShippingAddressInput {
  label?: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  phone?: string;
  isDefault?: boolean;
}

async function patientForUser(user: AuthedUser) {
  const org = await ensureLeafmartOrganization();
  return ensurePatientForUser(user, org.id);
}

export async function listAddressesForUser(user: AuthedUser): Promise<ShippingAddress[]> {
  const patient = await patientForUser(user);
  return prisma.shippingAddress.findMany({
    where: { patientId: patient.id },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getDefaultAddressForUser(user: AuthedUser): Promise<ShippingAddress | null> {
  const patient = await patientForUser(user);
  return prisma.shippingAddress.findFirst({
    where: { patientId: patient.id, isDefault: true },
  });
}

export async function createAddressForUser(
  user: AuthedUser,
  input: ShippingAddressInput,
): Promise<ShippingAddress> {
  const patient = await patientForUser(user);
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.shippingAddress.updateMany({
        where: { patientId: patient.id, isDefault: true },
        data: { isDefault: false },
      });
    }
    // First address is automatically default.
    const existing = await tx.shippingAddress.count({ where: { patientId: patient.id } });
    return tx.shippingAddress.create({
      data: {
        patientId: patient.id,
        label: input.label,
        firstName: input.firstName,
        lastName: input.lastName,
        address1: input.address1,
        address2: input.address2,
        city: input.city,
        state: input.state.toUpperCase(),
        postalCode: input.postalCode,
        phone: input.phone,
        isDefault: input.isDefault ?? existing === 0,
      },
    });
  });
}

export async function updateAddressForUser(
  user: AuthedUser,
  id: string,
  input: Partial<ShippingAddressInput>,
): Promise<ShippingAddress> {
  const patient = await patientForUser(user);
  return prisma.$transaction(async (tx) => {
    const owned = await tx.shippingAddress.findFirst({
      where: { id, patientId: patient.id },
    });
    if (!owned) throw new Error("NOT_FOUND");
    if (input.isDefault) {
      await tx.shippingAddress.updateMany({
        where: { patientId: patient.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
    return tx.shippingAddress.update({
      where: { id },
      data: {
        ...input,
        state: input.state ? input.state.toUpperCase() : undefined,
      },
    });
  });
}

export async function deleteAddressForUser(user: AuthedUser, id: string): Promise<void> {
  const patient = await patientForUser(user);
  const owned = await prisma.shippingAddress.findFirst({
    where: { id, patientId: patient.id },
  });
  if (!owned) throw new Error("NOT_FOUND");
  await prisma.shippingAddress.delete({ where: { id } });

  // If we deleted the default, promote the most-recently-updated remaining one.
  if (owned.isDefault) {
    const next = await prisma.shippingAddress.findFirst({
      where: { patientId: patient.id },
      orderBy: { updatedAt: "desc" },
    });
    if (next) {
      await prisma.shippingAddress.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }
}
