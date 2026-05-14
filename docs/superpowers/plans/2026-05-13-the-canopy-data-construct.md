# The Canopy (Data-Display Construct) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create "The Canopy," a unified data-display and insight-board architecture that provides smooth, efficient metric rendering with drilldowns to patient lists and built-in period comparisons.

**Architecture:** A three-layered architecture consisting of (1) the Metric Primitive (Cell/Card component), (2) the Board Composition (layout and shared context), and (3) the Rendering Vocabulary (standardized charts/trends). Features a cohort filter defaulting at the board level with cell-level override support, drilldowns pointing to patient lists, and real-time optimized fetching for rendering smoothness.

**Tech Stack:** Next.js (App Router), React Server Components, Tailwind CSS, Prisma, Jest.

---

### Task 1: Core Types and Metric Primitive

**Files:**
- Create: `src/lib/canopy/types.ts`
- Create: `src/components/canopy/CanopyCell.tsx`

- [ ] **Step 1: Write the minimal implementation for Types**

```typescript
// src/lib/canopy/types.ts
export type ComparisonMode = "prior_period" | "prior_year" | "none";

export interface CohortFilter {
  dateRange?: { start: Date; end: Date };
  providerId?: string;
  diagnosisCodes?: string[];
}

export interface MetricData {
  id: string;
  title: string;
  currentValue: number | string;
  previousValue?: number | string;
  trendPercentage?: number;
  format: "number" | "currency" | "percentage" | "time";
  drilldownUrl: string; // Defaults to a filtered patient list
}

export interface CanopyCellProps {
  metric: MetricData;
  comparisonMode?: ComparisonMode;
  cellCohortOverride?: CohortFilter;
  isLoading?: boolean;
}
```

- [ ] **Step 2: Write the minimal implementation for the Cell Component**

```tsx
// src/components/canopy/CanopyCell.tsx
import React from "react";
import Link from "next/link";
import { CanopyCellProps } from "@/lib/canopy/types";

export function CanopyCell({ metric, comparisonMode = "prior_period", isLoading = false }: CanopyCellProps) {
  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg shadow-sm bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-8 bg-gray-300 rounded w-1/3"></div>
      </div>
    );
  }

  const isPositive = metric.trendPercentage && metric.trendPercentage > 0;
  const isNegative = metric.trendPercentage && metric.trendPercentage < 0;

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white flex flex-col">
      <h3 className="text-sm font-medium text-gray-500">{metric.title}</h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-gray-900">{metric.currentValue}</span>
        {metric.trendPercentage !== undefined && comparisonMode !== "none" && (
          <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'}`}>
            {isPositive ? '↑' : isNegative ? '↓' : ''} {Math.abs(metric.trendPercentage)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <Link href={metric.drilldownUrl} className="text-sm text-blue-600 hover:underline">
          View Patients →
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/canopy/types.ts src/components/canopy/CanopyCell.tsx
git commit -m "feat(canopy): add core types and CanopyCell metric primitive"
```

### Task 2: Board Composition and Filter Context

**Files:**
- Create: `src/components/canopy/CanopyBoard.tsx`

- [ ] **Step 1: Write the minimal implementation for Board Context and Layout**

```tsx
// src/components/canopy/CanopyBoard.tsx
"use client";

import React, { createContext, useContext, useState } from "react";
import { CohortFilter, ComparisonMode } from "@/lib/canopy/types";

interface CanopyBoardContextType {
  globalFilter: CohortFilter;
  setGlobalFilter: (filter: CohortFilter) => void;
  globalComparison: ComparisonMode;
  setGlobalComparison: (mode: ComparisonMode) => void;
}

const CanopyBoardContext = createContext<CanopyBoardContextType | undefined>(undefined);

export function useCanopyBoard() {
  const context = useContext(CanopyBoardContext);
  if (!context) throw new Error("useCanopyBoard must be used within CanopyBoard");
  return context;
}

interface CanopyBoardProps {
  title: string;
  description?: string;
  initialFilter?: CohortFilter;
  initialComparison?: ComparisonMode;
  children: React.ReactNode;
}

export function CanopyBoard({ 
  title, 
  description, 
  initialFilter = {}, 
  initialComparison = "prior_period",
  children 
}: CanopyBoardProps) {
  const [globalFilter, setGlobalFilter] = useState<CohortFilter>(initialFilter);
  const [globalComparison, setGlobalComparison] = useState<ComparisonMode>(initialComparison);

  return (
    <CanopyBoardContext.Provider value={{ globalFilter, setGlobalFilter, globalComparison, setGlobalComparison }}>
      <div className="space-y-6">
        <div className="flex justify-between items-end border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
            {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
          </div>
          {/* Placeholder for Global Filter Controls UI */}
          <div className="flex gap-2 text-sm">
            <select 
              className="border rounded p-1"
              value={globalComparison}
              onChange={(e) => setGlobalComparison(e.target.value as ComparisonMode)}
            >
              <option value="prior_period">Prior Period</option>
              <option value="prior_year">Prior Year</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children}
        </div>
      </div>
    </CanopyBoardContext.Provider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/canopy/CanopyBoard.tsx
git commit -m "feat(canopy): implement CanopyBoard composition and context provider"
```

### Task 3: Example Implementation (EMR-168 Proof)

**Files:**
- Create: `src/app/(clinician)/atlas/page.tsx`

- [ ] **Step 1: Write the minimal implementation for an Example Canopy Board**

```tsx
// src/app/(clinician)/atlas/page.tsx
import React, { Suspense } from "react";
import { CanopyBoard } from "@/components/canopy/CanopyBoard";
import { CanopyCell } from "@/components/canopy/CanopyCell";

// Simulated fetch for rendering smoothness proof
async function fetchMetricData(id: string) {
  // In a real implementation, this reads from DB using global filters / overrides
  return {
    id,
    title: id === "active-patients" ? "Active Patients (30d)" : "Follow-up Compliance",
    currentValue: id === "active-patients" ? "1,204" : "86%",
    trendPercentage: id === "active-patients" ? 12 : -3,
    format: "number" as const,
    drilldownUrl: `/patients?cohort=${id}`,
  };
}

async function AsyncCell({ id }: { id: string }) {
  const data = await fetchMetricData(id);
  return <CanopyCell metric={data} />;
}

export default function AtlasPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CanopyBoard 
        title="The Canopy" 
        description="Unified data-display construct and organizational insight board."
      >
        <Suspense fallback={<CanopyCell metric={{ id: "load", title: "Loading...", currentValue: "-", format: "number", drilldownUrl: "#" }} isLoading={true} />}>
          <AsyncCell id="active-patients" />
        </Suspense>
        
        <Suspense fallback={<CanopyCell metric={{ id: "load", title: "Loading...", currentValue: "-", format: "number", drilldownUrl: "#" }} isLoading={true} />}>
          <AsyncCell id="compliance" />
        </Suspense>
      </CanopyBoard>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(clinician\)/atlas/page.tsx
git commit -m "feat(canopy): implement example Atlas page as EMR-168 proof of concept"
```
