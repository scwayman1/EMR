# Practice Onboarding Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Backend Foundation for the super admin Practice Onboarding Controller, including draft configuration APIs, Zod validation, and inline Org creation.

**Architecture:** We use the existing `PracticeConfiguration` Prisma model. The `/api/configs/[draftId]` route acts as a PATCH endpoint utilizing a Zod `.partial()` schema for drafts, and a strict full schema for the final "Publish" step. The wizard Step 1 will allow posting to `/api/orgs` inline. We use `requireImplementationAdmin()` globally.

**Tech Stack:** Next.js (App Router), Prisma, Zod, Jest.

---

### Task 1: Zod Schema and Partial Draft Validation (EMR-429 & EMR-435)

**Files:**
- Create: `src/lib/practice-config/schema.ts`
- Create: `src/lib/practice-config/schema.test.ts`
- Modify: `src/app/api/configs/[id]/route.ts`

- [ ] **Step 1: Write the failing test for the Schema Validator**

```typescript
// src/lib/practice-config/schema.test.ts
import { practiceConfigSchema, draftPracticeConfigSchema } from "./schema";

describe("PracticeConfig Schemas", () => {
  it("draft allows missing required fields", () => {
    const result = draftPracticeConfigSchema.safeParse({
      organizationId: "org-1",
    });
    expect(result.success).toBe(true);
  });

  it("draft strictly validates provided fields", () => {
    const result = draftPracticeConfigSchema.safeParse({
      organizationId: "org-1",
      npi: "123", // Invalid length
    });
    expect(result.success).toBe(false);
  });

  it("publish schema requires all fields", () => {
    const result = practiceConfigSchema.safeParse({
      organizationId: "org-1",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/practice-config/schema.test.ts`
Expected: FAIL with "practiceConfigSchema is not defined"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/practice-config/schema.ts
import { z } from "zod";

export const practiceConfigSchema = z.object({
  organizationId: z.string().min(1),
  practiceId: z.string().min(1),
  selectedSpecialty: z.string().min(1),
  workflowTemplateIds: z.array(z.string()).min(1),
  chartingTemplateIds: z.array(z.string()).min(1),
  rolePermissionTemplateIds: z.array(z.string()).min(1),
  patientShellTemplateId: z.string().min(1),
  physicianShellTemplateId: z.string().min(1),
  npi: z.string().regex(/^\d{10}$/, "NPI must be 10 digits").optional(),
});

export const draftPracticeConfigSchema = practiceConfigSchema.partial();
```

- [ ] **Step 4: Update the Config PATCH endpoint to use the draft schema**

```typescript
// src/app/api/configs/[id]/route.ts (update the POST/PATCH handler)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireImplementationAdmin } from "@/lib/auth/super-admin";
import { draftPracticeConfigSchema } from "@/lib/practice-config/schema";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  await requireImplementationAdmin();
  const body = await req.json();

  const parsed = draftPracticeConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.practiceConfiguration.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ config: updated });
}
```

- [ ] **Step 5: Run tests and commit**

Run: `npx jest src/lib/practice-config/schema.test.ts`
Expected: PASS

```bash
git add src/lib/practice-config/schema.test.ts src/lib/practice-config/schema.ts src/app/api/configs/[id]/route.ts
git commit -m "feat(emr-429): implement strict Zod draft schema and update config PATCH route"
```

### Task 2: Inline Organization Creation API Support (EMR-420)

**Files:**
- Modify: `src/components/onboarding/steps/step-1-org-practice.tsx`

- [ ] **Step 1: Add "Create New Org" capability to Step 1**

```tsx
// src/components/onboarding/steps/step-1-org-practice.tsx (Append button & handler logic)
// *Note: Replace existing placeholder or add to the form*
import React, { useState } from "react";
import { Button } from "@/components/ui/button";

export function CreateOrgInlineForm({ onCreated }: { onCreated: (orgId: string) => void }) {
  const [loading, setLoading] = useState(false);
  
  const handleCreate = async () => {
    setLoading(true);
    // Minimal mock payload for inline creation
    const payload = {
      legalName: "New Inline Org",
      brandName: "New Inline Org",
      primaryContactName: "Admin",
      primaryContactEmail: "admin@example.com",
      street: "123 Main St",
      city: "San Francisco",
      state: "CA",
      postalCode: "94105",
      timeZone: "America/Los_Angeles"
    };

    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        onCreated(data.organization.id);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleCreate} disabled={loading}>
      {loading ? "Creating..." : "Quick Create Org"}
    </Button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/onboarding/steps/step-1-org-practice.tsx
git commit -m "feat(emr-420): allow inline org creation in wizard step 1"
```
