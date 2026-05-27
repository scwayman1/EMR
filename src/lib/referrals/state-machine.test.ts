import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { approveReferral, declineReferral } from "./state-machine";
import { prisma } from "../db/prisma";

vi.mock("../db/prisma", () => ({
  prisma: {
    outboundReferral: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Referral State Machine", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should transition from pending_approval to approved", async () => {
    (prisma.outboundReferral.findUnique as Mock).mockResolvedValue({ id: "ref_1", status: "pending_approval" });
    
    await approveReferral("ref_1", "user_1");
    
    expect(prisma.outboundReferral.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ref_1" },
        data: expect.objectContaining({ status: "approved", approvedById: "user_1" }),
      })
    );
  });

  it("should fail to approve a non-pending referral", async () => {
    (prisma.outboundReferral.findUnique as Mock).mockResolvedValue({ id: "ref_1", status: "draft" });
    
    await expect(approveReferral("ref_1", "user_1")).rejects.toThrow("Invalid state transition");
  });

  it("should transition to declined", async () => {
    (prisma.outboundReferral.findUnique as Mock).mockResolvedValue({ id: "ref_1", status: "draft" });
    
    await declineReferral("ref_1", "Patient refused.");
    
    expect(prisma.outboundReferral.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ref_1" },
        data: expect.objectContaining({ status: "declined", declineReason: "Patient refused." }),
      })
    );
  });
});
