// TODO(EMR-791): swap to @/lib/domain/supplies once PR pma/v1-foundation lands.
// Mirrors the contract the Architect (EMR-788/789/790/794) is shipping.

export type SupplyOrderStatus =
  | "agent_drafted"
  | "awaiting_approval"
  | "approved"
  | "submitted"
  | "shipped"
  | "delivered"
  | "rejected"
  | "cancelled";

export type ProposedBy =
  | { kind: "agent"; agentId: string }
  | { kind: "user"; userId: string };

export interface SupplyOrderRow {
  id: string;
  supplyName: string;
  supplierName: string | null;
  qty: number;
  unitCostCents: number;
  totalCents: number;
  status: SupplyOrderStatus;
  proposedBy: ProposedBy;
  /** Pre-rendered "Agent: supplyReorderAgent" or "User: Dr. Patel". */
  proposedByLabel: string;
  approvedByLabel: string | null;
  autoSubmitted: boolean;
  expectedDeliveryAt: string | null;
  createdAt: string;
  submittedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  rejectionReason: string | null;
}
