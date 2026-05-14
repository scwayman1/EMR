# Referral Faxes & Provider Directory (EMR-167) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the backend foundation for EMR-167, enabling outbound referral faxes via an e-fax integration and establishing a local provider directory backed by NPPES data, complete with a clinician-approved transmission state machine.

**Architecture:** 
1. `ExternalProvider` model acting as a local cache/relationship layer on top of NPPES data.
2. `OutboundReferral` model to track the payload and state of the fax transmission.
3. A state machine enforcing clinician approval before any fax is dispatched (`draft` -> `pending_approval` -> `approved` -> `transmitting` -> `delivered` / `failed` / `declined`). Features a "decline referral" affordance to close failure loops securely.

**Tech Stack:** Next.js (App Router), Prisma, Jest, TypeScript.

---

### Task 1: Database Schema Expansion

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Write the schema additions for ExternalProvider and OutboundReferral**

```prisma
// Append to prisma/schema.prisma

/// EMR-167 — Local cache and relationship layer for external providers.
/// Seeds from NPPES (NPI registry) but allows practice-specific tagging
/// (e.g., marking a provider as a "favorite" referral target).
model ExternalProvider {
  id             String   @id @default(cuid())
  organizationId String
  npi            String
  firstName      String
  lastName       String
  specialty      String?
  organization   String? // Practice or hospital name
  faxNumber      String?
  phone          String?
  addressLine1   String?
  addressLine2   String?
  city           String?
  state          String?
  postalCode     String?
  isFavorite     Boolean  @default(false)
  
  lastNppesSyncAt DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  org Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  referralsReceived OutboundReferral[]

  @@unique([organizationId, npi])
  @@index([organizationId, isFavorite])
}

enum OutboundReferralStatus {
  draft             // Being assembled by AI or user
  pending_approval  // Waiting for clinician sign-off
  approved          // Clinician approved, ready for e-fax queue
  transmitting      // Currently sending via e-fax provider
  delivered         // E-fax provider confirmed delivery
  failed            // Transmission failed
  declined          // Patient declined the referral (closes loop)
}

/// EMR-167 — Tracks the state and payload of an outbound referral fax.
model OutboundReferral {
  id                 String                 @id @default(cuid())
  organizationId     String
  patientId          String
  targetProviderId   String
  
  status             OutboundReferralStatus @default(draft)
  payloadUrl         String? // Link to generated PDF/document
  notes              String?
  
  // State machine timestamps
  approvedAt         DateTime?
  approvedById       String?
  transmittedAt      DateTime?
  deliveredAt        DateTime?
  failedAt           DateTime?
  declinedAt         DateTime?
  declineReason      String?

  createdAt          DateTime               @default(now())
  updatedAt          DateTime               @updatedAt

  organization       Organization           @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  patient            Patient                @relation(fields: [patientId], references: [id], onDelete: Cascade)
  targetProvider     ExternalProvider       @relation(fields: [targetProviderId], references: [id])

  @@index([organizationId, status])
  @@index([patientId, status])
}
```

- [ ] **Step 2: Generate and validate the Prisma schema**

Run: `npx prisma format && npx prisma validate`
Expected: SUCCESS

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(emr-167): add ExternalProvider and OutboundReferral models"
```

### Task 2: Referral State Machine

**Files:**
- Create: `src/lib/referrals/state-machine.ts`
- Create: `src/lib/referrals/state-machine.test.ts`

- [ ] **Step 1: Write the failing test for the state machine**

```typescript
// src/lib/referrals/state-machine.test.ts
import { approveReferral, declineReferral } from "./state-machine";
import { prisma } from "../db/prisma";

jest.mock("../db/prisma", () => ({
  prisma: {
    outboundReferral: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("Referral State Machine", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should transition from pending_approval to approved", async () => {
    (prisma.outboundReferral.findUnique as jest.Mock).mockResolvedValue({ id: "ref_1", status: "pending_approval" });
    
    await approveReferral("ref_1", "user_1");
    
    expect(prisma.outboundReferral.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ref_1" },
        data: expect.objectContaining({ status: "approved", approvedById: "user_1" }),
      })
    );
  });

  it("should fail to approve a non-pending referral", async () => {
    (prisma.outboundReferral.findUnique as jest.Mock).mockResolvedValue({ id: "ref_1", status: "draft" });
    
    await expect(approveReferral("ref_1", "user_1")).rejects.toThrow("Invalid state transition");
  });

  it("should transition to declined", async () => {
    (prisma.outboundReferral.findUnique as jest.Mock).mockResolvedValue({ id: "ref_1", status: "draft" });
    
    await declineReferral("ref_1", "Patient refused.");
    
    expect(prisma.outboundReferral.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ref_1" },
        data: expect.objectContaining({ status: "declined", declineReason: "Patient refused." }),
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/referrals/state-machine.test.ts`
Expected: FAIL with missing functions.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/referrals/state-machine.ts
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
  if (["transmitted", "delivered", "declined"].includes(referral.status)) {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/referrals/state-machine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/referrals/state-machine.ts src/lib/referrals/state-machine.test.ts
git commit -m "feat(emr-167): implement referral approval and decline state machine"
```
