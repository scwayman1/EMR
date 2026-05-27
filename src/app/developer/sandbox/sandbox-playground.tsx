"use client";

import Link from "next/link";
import { useState } from "react";
import { Play, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/ornament";

const MAX_RUNS = 2;

const SAMPLE_PROMPTS: { label: string; method: string; path: string; mockResponse: string }[] = [
  {
    label: "List sandbox patients",
    method: "GET",
    path: "/v1/patients?limit=2",
    mockResponse: JSON.stringify(
      {
        data: [
          {
            id: "pt_synth_001",
            display_name: "A. Sandbox",
            mrn: "SYN-001",
            care_plan: "CBD 25mg BID; outcome check weekly",
          },
          {
            id: "pt_synth_002",
            display_name: "B. Sandbox",
            mrn: "SYN-002",
            care_plan: "Watchful waiting; consult in 30 days",
          },
        ],
        has_more: true,
      },
      null,
      2
    ),
  },
  {
    label: "Create a synthetic appointment",
    method: "POST",
    path: "/v1/appointments",
    mockResponse: JSON.stringify(
      {
        id: "apt_synth_91a2",
        patient_id: "pt_synth_001",
        scheduled_at: "2026-05-15T15:00:00Z",
        status: "scheduled",
        clinician_id: "clin_synth_004",
      },
      null,
      2
    ),
  },
  {
    label: "Search the research KB",
    method: "GET",
    path: "/v1/research/articles?q=CBD+chronic+pain",
    mockResponse: JSON.stringify(
      {
        data: [
          {
            pmid: "33457469",
            title: "CBD for chronic pain: a systematic review",
            evidence: "moderate",
          },
          {
            pmid: "31180537",
            title: "Cannabinoids and pain: new insights from old molecules",
            evidence: "strong",
          },
        ],
        total: 47,
      },
      null,
      2
    ),
  },
];

export function SandboxPlayground() {
  const [runs, setRuns] = useState(0);
  const [active, setActive] = useState(0);
  const [response, setResponse] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const exhausted = runs >= MAX_RUNS;
  const sample = SAMPLE_PROMPTS[active];

  function run() {
    if (exhausted || running) return;
    setRunning(true);
    setResponse(null);
    setTimeout(() => {
      setResponse(sample.mockResponse);
      setRuns((r) => r + 1);
      setRunning(false);
    }, 600);
  }

  return (
    <div>
      <Eyebrow className="mb-3">Mock playground</Eyebrow>
      <h2 className="font-display text-2xl md:text-3xl text-text tracking-tight mb-6">
        Run a sample request
      </h2>

      <div className="rounded-2xl border border-border bg-surface-raised overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-border bg-surface-muted flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PROMPTS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setActive(i);
                  setResponse(null);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  i === active
                    ? "bg-accent text-white"
                    : "bg-surface text-text-muted hover:text-text border border-border"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-subtle">
            {runs} / {MAX_RUNS} runs used
          </span>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-mono font-semibold px-2 py-1 rounded bg-emerald-100 text-emerald-700">
              {sample.method}
            </span>
            <code className="text-sm font-mono text-text break-all">
              {sample.path}
            </code>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={run} disabled={exhausted || running}>
              {running ? "Running…" : <span className="inline-flex items-center gap-2"><Play className="w-4 h-4" /> Run</span>}
            </Button>
            {exhausted && (
              <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                <Lock className="w-3.5 h-3.5" /> Limit reached
              </span>
            )}
          </div>

          <pre className="text-sm font-mono bg-[#1a1f1c] text-[#e8e6e1] rounded-xl p-5 overflow-x-auto min-h-[160px]">
            <code>{response ?? "// Click Run to see the mock response"}</code>
          </pre>
        </div>
      </div>

      {exhausted && (
        <div className="mt-8 rounded-2xl border border-accent/30 bg-accent/5 p-6 md:p-8">
          <h3 className="font-display text-xl text-text mb-2">
            Want more than two runs?
          </h3>
          <p className="text-sm text-text-muted leading-relaxed mb-4 max-w-xl">
            Talk to a developer to get a fully provisioned sandbox org with a
            scoped key, synthetic data fixtures, and webhook delivery.
          </p>
          <Link href="/contact?role=Developer%20Sandbox">
            <Button size="lg">Talk to a developer</Button>
          </Link>
        </div>
      )}

      <p className="mt-6 text-xs text-text-subtle leading-relaxed">
        Sandbox responses are deterministic mocks generated client-side. No
        Leafjourney servers are contacted by this preview.
      </p>
    </div>
  );
}
