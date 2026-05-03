"use client";

import Link from "next/link";
import { useState } from "react";
import { Lock, Sparkles, Stethoscope, ArrowRight, Atom } from "lucide-react";

import { Eyebrow } from "@/components/ui/ornament";

import { EducationTabs, type TabKey } from "@/components/education/EducationTabs";
import { ComboWheel } from "@/components/education/ComboWheel";
import { ResearchTab } from "@/components/education/ResearchTab";
import { LearnTab } from "@/components/education/LearnTab";
import { DiscussCombination } from "@/components/education/DiscussCombination";

export default function LeafmartEducationPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("wheel");
  const [wheelSelection, setWheelSelection] = useState<string[]>([]);

  return (
    <div className="pb-12">
      <div className="max-w-[1320px] mx-auto px-6 lg:px-12 pt-16 pb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Eyebrow className="justify-center mb-6 text-accent">Empower your wellness</Eyebrow>
        <h1 className="font-display text-5xl md:text-6xl tracking-tight text-text mb-6">
          Cannabis Education
        </h1>
        <p className="text-xl text-text-muted mt-4 max-w-2xl mx-auto leading-relaxed">
          Discover the science behind our products. Learn about cannabinoids,
          terpenes, and how to find the perfect regimen for your lifestyle.
        </p>
      </div>

      <EducationTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div
        key={activeTab}
        className="max-w-[1320px] mx-auto px-6 lg:px-12 py-16 animate-in fade-in duration-500"
      >
        {activeTab === "wheel" && (
          <>
            <ComboWheel context="leafmart" onSelect={setWheelSelection} />
            <DiscussCombination selectedIds={wheelSelection} />
          </>
        )}
        {activeTab === "research" && <ResearchTab />}
        {activeTab === "community" && <LearnTab />}
        {activeTab === "chatcb" && (
          <ChatCBClinicalGate onExploreWheel={() => setActiveTab("wheel")} />
        )}
      </div>
    </div>
  );
}

function ChatCBClinicalGate({ onExploreWheel }: { onExploreWheel: () => void }) {
  return (
    <div className="mx-auto max-w-3xl animate-in fade-in zoom-in-95 duration-500">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-emerald-50 via-white to-indigo-50 shadow-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl"
        />

        <div className="relative p-10 md:p-14 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-md ring-1 ring-border">
            <div className="relative">
              <Sparkles className="h-10 w-10 text-accent" strokeWidth={2} />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow ring-2 ring-white">
                <Lock className="h-3 w-3" strokeWidth={2.5} />
              </span>
            </div>
          </div>

          <Eyebrow className="justify-center mb-4 text-emerald-700">
            Clinical Tool
          </Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl tracking-tight text-text mb-4">
            ChatCB lives in the clinical portal
          </h2>
          <p className="text-lg text-text-muted leading-relaxed max-w-xl mx-auto mb-8">
            ChatCB is our cannabis search engine for licensed providers and
            enrolled patients. It pulls from PubMed, structured cannabinoid
            research, and de-identified outcome data &mdash; so we keep it
            inside Leafjourney for HIPAA-aligned clinical use.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link
              href="/sign-up"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <Stethoscope className="h-4 w-4" strokeWidth={2.5} />
              Sign up for Leafjourney
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
            </Link>
            <button
              type="button"
              onClick={onExploreWheel}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white px-7 py-3 text-sm font-semibold text-text transition-all hover:border-accent/40 hover:bg-white hover:-translate-y-0.5"
            >
              <Atom className="h-4 w-4" strokeWidth={2.5} />
              Explore the Combo Wheel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <GateFeature
              title="PubMed-backed"
              body="Conversational answers grounded in peer-reviewed cannabis research."
            />
            <GateFeature
              title="Real-world outcomes"
              body="De-identified patient outcome data informs every recommendation."
            />
            <GateFeature
              title="Provider-supervised"
              body="Available to enrolled patients alongside their Leafjourney clinician."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function GateFeature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white/70 backdrop-blur p-4">
      <div className="text-sm font-semibold text-text mb-1">{title}</div>
      <div className="text-xs text-text-muted leading-relaxed">{body}</div>
    </div>
  );
}
