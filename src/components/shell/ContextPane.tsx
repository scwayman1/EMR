"use client";

import React, { useState } from "react";
import { Activity, History, FlaskConical, AlertCircle } from "lucide-react";

interface ContextPaneLayoutProps {
  activeTab: "vitals" | "history" | "labs";
  setActiveTab: (tab: "vitals" | "history" | "labs") => void;
}

export function ContextPaneLayout({ activeTab, setActiveTab }: ContextPaneLayoutProps) {
  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Tab Navigation Header */}
      <div className="flex border-b border-border bg-surface-muted text-xs font-semibold select-none">
        {(["vitals", "history", "labs"] as const).map((tab) => {
          const Icon =
            tab === "vitals" ? Activity : tab === "history" ? History : FlaskConical;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 border-b-2 capitalize transition-all ${
                isActive
                  ? "border-accent text-accent font-bold bg-surface"
                  : "border-transparent text-text-muted hover:text-text hover:bg-surface-hover"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab}
            </button>
          );
        })}
      </div>

      {/* Content Container */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {activeTab === "vitals" && (
          <div className="space-y-4 fade-in">
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Real-time Vitals</span>
              <h4 className="text-sm font-bold text-text mt-0.5">Encounter Diagnostics</h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 border border-border rounded-xl bg-surface-muted shadow-sm hover:border-accent/30 transition-all">
                <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Sleep Quality</span>
                <p className="text-xl font-bold text-text mt-1 flex items-baseline gap-1.5">
                  78%
                  <span className="text-xs text-emerald-500 font-normal">↑ 5%</span>
                </p>
              </div>
              <div className="p-3.5 border border-border rounded-xl bg-surface-muted shadow-sm hover:border-accent/30 transition-all">
                <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Pain Level (NRS)</span>
                <p className="text-xl font-bold text-text mt-1 flex items-baseline gap-1.5">
                  4/10
                  <span className="text-xs text-emerald-500 font-normal">↓ 2pt</span>
                </p>
              </div>
            </div>

            <div className="border border-border p-4 rounded-xl space-y-2 bg-surface shadow-sm">
              <h5 className="text-xs font-semibold text-text uppercase tracking-wider">Active Regimen</h5>
              <div className="text-xs text-text-muted space-y-1.5">
                <p className="flex items-center justify-between">
                  <span>THC:CBD Edible (Evening)</span>
                  <span className="font-semibold text-text">5mg : 10mg</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Linalool Tincture (PRN)</span>
                  <span className="font-semibold text-text">1.5 mL</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-500" />
              <div className="text-xs">
                <h5 className="font-semibold mb-0.5">Dosing Warning</h5>
                <p className="leading-relaxed text-text-muted">Patient reports mild daytime somnolence when increasing evening CBD dose.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4 fade-in">
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Patient Context</span>
              <h4 className="text-sm font-bold text-text mt-0.5">Medical History</h4>
            </div>

            <div className="border border-border p-4 rounded-xl space-y-3 bg-surface shadow-sm">
              <div>
                <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Active Diagnoses</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="px-2.5 py-1 text-xs rounded-full bg-surface-muted border border-border text-text font-medium">Chronic Lower Back Pain</span>
                  <span className="px-2.5 py-1 text-xs rounded-full bg-surface-muted border border-border text-text font-medium">Insomnia</span>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Primary Care Provider</span>
                <p className="text-xs font-semibold text-text mt-1">Dr. Neal Patel, MD</p>
              </div>

              <div className="border-t border-border pt-3">
                <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Known Allergies</span>
                <p className="text-xs font-semibold text-red-500 mt-1">NKDA (No Known Drug Allergies)</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "labs" && (
          <div className="space-y-4 fade-in">
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Diagnostic Reports</span>
              <h4 className="text-sm font-bold text-text mt-0.5">Labs & Outcomes</h4>
            </div>

            <div className="border border-border p-4 rounded-xl bg-surface shadow-sm space-y-3">
              <div>
                <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Outcome Survey History</span>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-text-muted">Canna-QoL Index</span>
                    <span className="font-bold text-emerald-500">82 / 100</span>
                  </div>
                  <div className="w-full bg-surface-muted h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: "82%" }}></div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Recent Lab Values</span>
                <div className="text-xs space-y-1.5 text-text-muted">
                  <p className="flex justify-between">
                    <span>Hepatic Panel (ALT/AST)</span>
                    <span className="font-semibold text-text">Normal (24/22 U/L)</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Renal Panel (Creatinine)</span>
                    <span className="font-semibold text-text">0.9 mg/dL</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ContextPane() {
  const [activeTab, setActiveTab] = useState<"vitals" | "history" | "labs">("vitals");
  return <ContextPaneLayout activeTab={activeTab} setActiveTab={setActiveTab} />;
}
