"use client";

import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

type Pane = {
  id: string;
  title: string;
  content: React.ReactNode;
};

interface SplitPaneContextValue {
  panes: Pane[];
  openPane: (pane: Pane) => void;
  closePane: (id: string) => void;
}

const SplitPaneContext = createContext<SplitPaneContextValue | null>(null);

export function useSplitPane() {
  const ctx = useContext(SplitPaneContext);
  if (!ctx) throw new Error("useSplitPane must be used within SplitPaneLayout");
  return ctx;
}

export function SplitPaneLayout({ children }: { children: React.ReactNode }) {
  const [panes, setPanes] = useState<Pane[]>([]);

  const openPane = (pane: Pane) => {
    setPanes((prev) => {
      if (prev.find((p) => p.id === pane.id)) return prev;
      if (prev.length >= 3) {
        // Replace the last pane if we hit the limit
        return [...prev.slice(0, 2), pane];
      }
      return [...prev, pane];
    });
  };

  const closePane = (id: string) => {
    setPanes((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <SplitPaneContext.Provider value={{ panes, openPane, closePane }}>
      <div className="flex h-full w-full overflow-hidden">
        {/* Main Workspace */}
        <div
          className={cn(
            "flex-1 transition-all duration-300 ease-in-out border-r border-slate-200",
            panes.length > 0 && "hidden lg:block lg:flex-none lg:w-1/3 xl:w-1/4"
          )}
        >
          {children}
        </div>

        {/* Dynamic Panes */}
        {panes.map((pane) => (
          <div
            key={pane.id}
            className="flex-1 flex flex-col border-r border-slate-200 bg-white min-w-[300px]"
          >
            <div className="h-12 border-b border-slate-200 flex items-center justify-between px-4 bg-slate-50">
              <span className="font-medium text-sm text-slate-700 truncate">
                {pane.title}
              </span>
              <button
                onClick={() => closePane(pane.id)}
                className="text-slate-400 hover:text-slate-600 rounded-md p-1 hover:bg-slate-200 transition-colors"
                aria-label="Close pane"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">{pane.content}</div>
          </div>
        ))}
      </div>
    </SplitPaneContext.Provider>
  );
}
