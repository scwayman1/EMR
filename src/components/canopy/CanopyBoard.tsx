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
