# Wearables Sync & CDS Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a background sync daemon that ingests wearable data, processes it through a Clinical Decision Support (CDS) rules engine, and creates deduplicated Task alerts for providers.

**Architecture:** A Next.js API route acts as the sync cron job. It calls a pure-function CDS engine to evaluate normalized data (OutcomeLog and ClinicalObservation). If rules trip, an Alert Router deduplicates and creates high-priority Inbox Tasks.

**Tech Stack:** Next.js (App Router), Prisma, Jest, TypeScript.

---

### Task 1: Clinical Decision Support (CDS) Engine

**Files:**
- Create: `src/lib/cds/engine.ts`
- Create: `src/lib/cds/engine.test.ts`

- [ ] **Step 1: Write the failing test for the CDS Engine**

```typescript
// src/lib/cds/engine.test.ts
import { evaluatePatientCDS } from "./engine";

describe("evaluatePatientCDS", () => {
  it("should return a CDSTrigger when overtraining rule is met", () => {
    const recentLogs = [];
    const recentObservations = [
      {
        patientId: "p1",
        category: "lifestyle_shift",
        summary: "Whoop Strain logged at 18/21.",
        metadata: { strain: 18 },
        createdAt: new Date(),
        id: "obs1",
        observedBy: "system:whoop",
        observedByKind: "agent",
        severity: "notable",
        evidence: {}
      }
    ] as any;

    const triggers = evaluatePatientCDS("p1", recentLogs, recentObservations);
    
    expect(triggers.length).toBeGreaterThan(0);
    expect(triggers[0].ruleName).toBe("OvertrainingRisk");
    expect(triggers[0].severity).toBe("notable");
  });

  it("should return empty array when no rules are met", () => {
    const recentLogs = [];
    const recentObservations = [
      {
        patientId: "p1",
        category: "lifestyle_shift",
        summary: "Whoop Strain logged at 10/21.",
        metadata: { strain: 10 },
        createdAt: new Date(),
        id: "obs1",
        observedBy: "system:whoop",
        observedByKind: "agent",
        severity: "info",
        evidence: {}
      }
    ] as any;

    const triggers = evaluatePatientCDS("p1", recentLogs, recentObservations);
    expect(triggers.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/cds/engine.test.ts`
Expected: FAIL with "evaluatePatientCDS is not defined"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/cds/engine.ts
import { OutcomeLog, ClinicalObservation } from "@prisma/client";

export interface CDSTrigger {
  patientId: string;
  ruleName: string;
  severity: "info" | "notable" | "concern" | "urgent";
  description: string;
}

export function evaluatePatientCDS(
  patientId: string,
  logs: OutcomeLog[],
  observations: ClinicalObservation[]
): CDSTrigger[] {
  const triggers: CDSTrigger[] = [];

  // Rule 1: Overtraining Risk
  const recentHighStrain = observations.find(
    (obs) =>
      obs.category === "lifestyle_shift" &&
      obs.metadata &&
      typeof obs.metadata === "object" &&
      (obs.metadata as any).strain > 16
  );

  if (recentHighStrain) {
    triggers.push({
      patientId,
      ruleName: "OvertrainingRisk",
      severity: "notable",
      description: `Patient exhibits high strain (${(recentHighStrain.metadata as any).strain}/21) indicating overtraining risk.`,
    });
  }

  return triggers;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/cds/engine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cds/engine.ts src/lib/cds/engine.test.ts
git commit -m "feat(cds): implement pure CDS rules engine"
```

### Task 2: Alert Router (Deduplication & Task Creation)

**Files:**
- Create: `src/lib/cds/alerts.ts`
- Create: `src/lib/cds/alerts.test.ts`

- [ ] **Step 1: Write the failing test for the Alert Router**

```typescript
// src/lib/cds/alerts.test.ts
import { routeCDSTriggers } from "./alerts";
import { prisma } from "../db/prisma";

jest.mock("../db/prisma", () => ({
  prisma: {
    task: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    patient: {
      findUnique: jest.fn(),
    }
  },
}));

describe("routeCDSTriggers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a task if no duplicate exists", async () => {
    (prisma.task.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ organizationId: "org1" });
    
    await routeCDSTriggers([
      {
        patientId: "p1",
        ruleName: "OvertrainingRisk",
        severity: "notable",
        description: "Test description",
      },
    ]);

    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "[CDS Alert] OvertrainingRisk",
          status: "open",
          patientId: "p1",
          organizationId: "org1"
        }),
      })
    );
  });

  it("should skip task creation if duplicate exists within 24 hours", async () => {
    (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: "existing-task" });
    
    await routeCDSTriggers([
      {
        patientId: "p1",
        ruleName: "OvertrainingRisk",
        severity: "notable",
        description: "Test description",
      },
    ]);

    expect(prisma.task.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/cds/alerts.test.ts`
Expected: FAIL with "routeCDSTriggers is not defined"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/cds/alerts.ts
import { prisma } from "../db/prisma";
import { CDSTrigger } from "./engine";

export async function routeCDSTriggers(triggers: CDSTrigger[]) {
  for (const trigger of triggers) {
    const title = `[CDS Alert] ${trigger.ruleName}`;

    // 1. Deduplication check
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingTask = await prisma.task.findFirst({
      where: {
        patientId: trigger.patientId,
        title: title,
        createdAt: {
          gte: twentyFourHoursAgo,
        },
        status: "open",
      },
    });

    if (existingTask) {
      console.log(`[CDS] Skipping duplicate alert for ${trigger.patientId} / ${trigger.ruleName}`);
      continue;
    }

    // 2. Fetch patient to get organizationId
    const patient = await prisma.patient.findUnique({
      where: { id: trigger.patientId },
      select: { organizationId: true },
    });

    if (!patient) continue;

    // 3. Create Task
    await prisma.task.create({
      data: {
        organizationId: patient.organizationId,
        patientId: trigger.patientId,
        title: title,
        description: `${trigger.description}\n\nReview chart at: /patients/${trigger.patientId}/biometrics`,
        status: "open",
      },
    });

    console.log(`[CDS] Created Task alert for ${trigger.patientId} / ${trigger.ruleName}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/cds/alerts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cds/alerts.ts src/lib/cds/alerts.test.ts
git commit -m "feat(cds): implement alert routing with 24h deduplication"
```

### Task 3: The Sync Daemon Cron Route

**Files:**
- Create: `src/app/api/cron/sync-wearables/route.ts`

- [ ] **Step 1: Write the minimal implementation**

```typescript
// src/app/api/cron/sync-wearables/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { evaluatePatientCDS } from "@/lib/cds/engine";
import { routeCDSTriggers } from "@/lib/cds/alerts";
import { whoopClient } from "@/lib/integrations/whoop-mapper";

// This route should be protected via cron secret in production
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find patients that need sync (placeholder filter for demo)
  const patients = await prisma.patient.findMany({
    take: 10,
    select: { id: true, organizationId: true }
  });

  const today = new Date().toISOString().split('T')[0];

  for (const patient of patients) {
    try {
      // 1. Sync Data
      // In a real implementation, we'd lookup their valid integration token.
      // We assume whoopClient handles the insertion to OutcomeLog and ClinicalObservation
      await whoopClient.syncPatientData(patient.id, "dummy_token", today);

      // 2. Fetch recent records to evaluate
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentLogs = await prisma.outcomeLog.findMany({
        where: { patientId: patient.id, loggedAt: { gte: twentyFourHoursAgo } },
      });
      const recentObservations = await prisma.clinicalObservation.findMany({
        where: { patientId: patient.id, createdAt: { gte: twentyFourHoursAgo } },
      });

      // 3. Run CDS Engine
      const triggers = evaluatePatientCDS(patient.id, recentLogs, recentObservations);

      // 4. Route Alerts
      if (triggers.length > 0) {
        await routeCDSTriggers(triggers);
      }
    } catch (error) {
      console.error(`[SyncDaemon] Failed to sync patient ${patient.id}:`, error);
      // Let it continue to the next patient
    }
  }

  return NextResponse.json({ success: true, processed: patients.length });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/sync-wearables/route.ts
git commit -m "feat(cron): implement sync daemon connecting whoop and CDS engine"
```
