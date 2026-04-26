"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";

export function DrugMixTab() {
  const [meds, setMeds] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkMix() {
    setLoading(true);
    // Dynamic import to mimic existing behavior
    const { checkInteractions } = await import("@/lib/domain/drug-interactions");
    const medList = meds.split("\n").map((m) => m.trim()).filter(Boolean);
    const cannabinoids = ["THC", "CBD", "CBN"];
    
    setTimeout(() => {
      const interactions = checkInteractions(medList, cannabinoids);
      setResults(interactions);
      setLoading(false);
    }, 800); // Add a small delay for realistic UX
  }

  const medCount = meds.split("\n").map((m) => m.trim()).filter(Boolean).length;

  return (
    <div className="max-w-3xl mx-auto space-y-8 sm:space-y-10 px-4 sm:px-0">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="font-display text-3xl sm:text-4xl text-text tracking-tight mb-3">
          Drug Interaction Checker
        </h2>
        <p className="text-sm sm:text-base text-text-muted max-w-xl mx-auto leading-relaxed">
          Check how your current medications interact with cannabinoids like THC, CBD, and CBN.
        </p>
      </div>

      <Card tone="raised" className="rounded-3xl shadow-xl overflow-hidden border border-border bg-white">
        <CardContent className="p-5 sm:p-8">
          <div className="flex items-center justify-between mb-3">
            <label
              htmlFor="drugmix-meds"
              className="block text-base font-semibold text-text"
            >
              Your current medications
            </label>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              {medCount} {medCount === 1 ? "med" : "meds"}
            </span>
          </div>
          <div className="relative">
            <textarea
              id="drugmix-meds"
              value={meds}
              onChange={(e) => setMeds(e.target.value)}
              placeholder={"Enter one medication per line, e.g.:\nWarfarin\nMetformin\nLisinopril\nSertraline"}
              rows={6}
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-base text-text placeholder:text-slate-400 focus:outline-none focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/20 transition-all resize-none shadow-inner"
            />
          </div>
          <Button
            onClick={checkMix}
            disabled={!meds.trim() || loading}
            className="mt-6 rounded-xl w-full h-14 text-base sm:text-lg font-semibold shadow-md"
          >
            {loading ? "Analyzing Database..." : "Check Interactions"}
          </Button>
        </CardContent>
      </Card>

      {results !== null && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-2xl">Results</h3>
            {results.length > 0 && (
              <Badge tone="neutral" className="text-[10px] uppercase tracking-widest font-bold">
                {results.length} {results.length === 1 ? "interaction" : "interactions"}
              </Badge>
            )}
          </div>
          
          {results.length === 0 ? (
            <Card className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/50 shadow-sm">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-emerald-900 mb-1">No known interactions found</h4>
                  <p className="text-emerald-700 font-medium">Based on our database, the medications listed do not have known severe interactions with cannabis. Always consult your provider.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            results.map((ix, i) => {
              const isRed = ix.severity === "red";
              const isYellow = ix.severity === "yellow";
              
              return (
                <Card key={i} className={cn(
                  "rounded-2xl border-2 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
                  isRed ? "border-red-400 bg-red-50/30" :
                  isYellow ? "border-amber-400 bg-amber-50/30" :
                  "border-emerald-400 bg-emerald-50/30"
                )}>
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={cn(
                        "p-3 rounded-full shrink-0",
                        isRed ? "bg-red-100 text-red-600" :
                        isYellow ? "bg-amber-100 text-amber-600" :
                        "bg-emerald-100 text-emerald-600"
                      )}>
                        {isRed ? <ShieldAlert className="w-6 h-6" /> :
                         isYellow ? <AlertTriangle className="w-6 h-6" /> :
                         <CheckCircle className="w-6 h-6" />}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h4 className="text-lg font-bold text-slate-800">
                            {ix.drug} <span className="text-slate-400 font-normal mx-1">+</span> {ix.cannabinoid}
                          </h4>
                          <Badge 
                            tone={isRed ? "danger" : isYellow ? "warning" : "success"}
                            className="uppercase tracking-widest text-[10px] font-bold"
                          >
                            {ix.severity} Severity
                          </Badge>
                        </div>
                        
                        <div className="bg-white/60 p-4 rounded-xl border border-black/5 mb-3">
                          <p className="text-sm text-slate-700 font-medium leading-relaxed">
                            <strong className="text-slate-900 block mb-1">Mechanism:</strong> 
                            {ix.mechanism}
                          </p>
                        </div>
                        
                        <p className={cn(
                          "text-sm font-bold flex items-center gap-2",
                          isRed ? "text-red-700" :
                          isYellow ? "text-amber-700" :
                          "text-emerald-700"
                        )}>
                          <span>Action:</span> {ix.recommendation}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
