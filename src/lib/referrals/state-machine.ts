import { prisma } from "../db/prisma";

export async function approveReferral(referralId: string, approverUserId: string) {
  const referral = await prisma.outboundReferral.findUnique({ where: { id: referralId } });
  
  if (!referral) throw new Error("Referral not found");
  if (referral.status !== "pending_approval") {
    throw new Error(`Invalid state transition: Cannot approve from ${referral.status}`);
  }

  return prisma.outboundReferral.update({
    where: { id: referralId },
    data: {
      status: "approved",
      approvedById: approverUserId,
      approvedAt: new Date(),
    },
  });
}

export async function declineReferral(referralId: string, reason: string) {
  const referral = await prisma.outboundReferral.findUnique({ where: { id: referralId } });
  
  if (!referral) throw new Error("Referral not found");
  if (["transmitting", "delivered", "declined"].includes(referral.status)) {
    throw new Error(`Invalid state transition: Cannot decline from ${referral.status}`);
  }

  return prisma.outboundReferral.update({
    where: { id: referralId },
    data: {
      status: "declined",
      declineReason: reason,
      declinedAt: new Date(),
    },
  });
}
