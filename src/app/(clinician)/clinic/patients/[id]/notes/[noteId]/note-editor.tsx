"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { saveNoteBlocks, saveAndFinalizeNote, refineSection, type RefineMode } from "./actions";
import { APSO_ORDER, NOTE_BLOCK_LABELS } from "@/lib/domain/notes";
import type { NoteBlockType } from "@/lib/domain/notes";
import { LeafSprig } from "@/components/ui/ornament";

interface NoteBlock {
  type?: NoteBlockType;
  heading: string;
  body: string;
}

interface NoteEditorProps {
  noteId: string;
  patientId: string;
  initialBlocks: NoteBlock[];
  status: string;
  aiDrafted: boolean;
  aiConfidence: number | null;
  codingSuggestion: {
    icd10: { code: string; label: string; confidence: number }[];
    emLevel: string | null;
    rationale: string | null;
  } | null;
}

const REFINE_OPTIONS: { mode: RefineMode; label: string; icon: string }[] = [
  { mode: "expand", label: "Expand", icon: "+" },
  { mode: "clinical", label: "Clinical", icon: "Rx" },
  { mode: "concise", label: "Concise", icon: "-" },
  { mode: "dosing", label: "Dosing", icon: "mg" },
  { mode: "clarify", label: "Clarify", icon: "?" },
];

/**
 * Defensive scrub for anything displayed in the Save/Finalize status slot.
 *
 * If a raw provider error body somehow slips in (for example from a legacy
 * code path that pre-dates our ModelError classification), collapse it to
 * a single human-friendly sentence. We never want to see `{"error":{...}}`
 * JSON next to the Save and Finalize buttons again.
 */
function scrubMessage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Detect a JSON-looking error dump
  if (trimmed.startsWith("{") && trimmed.includes('"error"')) {
    return "Something went wrong. Please try again.";
  }
  // Detect the legacy `OpenRouter error NNN: {...}` prefix
  if (/OpenRouter error \d+/i.test(trimmed)) {
    return "AI is temporarily unavailable. Please try again in a moment.";
  }
  return trimmed;
}

export function NoteEditor({
  noteId,
  patientId,
  initialBlocks,
  status,
  aiDrafted,
  aiConfidence,
  codingSuggestion,
}: NoteEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromBriefing = searchParams.get("from") === "briefing";
  const [refiningIndex, setRefiningIndex] = useState<number | null>(null);
  // Refine errors are per-section so a single failed refinement never
  // contaminates the Save/Finalize button row. Map of blockIndex -> friendly
  // message. The message is pre-scrubbed by the server action — raw provider
  // JSON never reaches here.
  const [refineErrors, setRefineErrors] = useState<Record<number, string>>({});
  const [blocks, setBlocks] = useState<NoteBlock[]>(() => {
    // Sort initial blocks in APSO order
    const sorted = [...initialBlocks].sort((a, b) => {
      const aIdx = a.type ? APSO_ORDER.indexOf(a.type) : APSO_ORDER.length;
      const bIdx = b.type ? APSO_ORDER.indexOf(b.type) : APSO_ORDER.length;
      return (aIdx === -1 ? APSO_ORDER.length : aIdx) - (bIdx === -1 ? APSO_ORDER.length : bIdx);
    });
    // Apply APSO display labels to headings
    return sorted.map((block) => ({
      ...block,
      heading: block.type && NOTE_BLOCK_LABELS[block.type]
        ? NOTE_BLOCK_LABELS[block.type]
        : block.heading,
    }));
  });
  const [isPending, startTransition] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(status);

  const isEditable = currentStatus === "draft" || currentStatus === "needs_review";

  function updateBlock(index: number, field: "heading" | "body", value: string) {
    setBlocks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveNoteBlocks(noteId, blocks);
      if (result.ok) {
        setSaveMessage("Saved successfully");
        setTimeout(() => setSaveMessage(null), 2000);
      } else {
        setSaveMessage(result.error);
      }
    });
  }

  function handleFinalize() {
    startTransition(async () => {
      const result = await saveAndFinalizeNote(noteId, blocks);
      if (result.ok) {
        setCurrentStatus("finalized");
        setSaveMessage("Note finalized and signed");
        router.refresh();
      } else {
        setSaveMessage(result.error);
      }
    });
  }

  async function handleRefine(index: number, mode: RefineMode) {
    setRefiningIndex(index);
    // Clear any prior error for this section before we try again.
    setRefineErrors((prev) => {
      if (!(index in prev)) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
    const block = blocks[index];
    const result = await refineSection(noteId, block.heading, block.body, mode);
    if (result.ok) {
      updateBlock(index, "body", result.refined);
      setSaveMessage(`${block.heading} refined`);
      setTimeout(() => setSaveMessage(null), 2000);
    } else {
      // Scoped per-section error — never leaks into the Save/Finalize row.
      setRefineErrors((prev) => ({ ...prev, [index]: result.error }));
    }
    setRefiningIndex(null);
  }

  function dismissRefineError(index: number) {
    setRefineErrors((prev) => {
      if (!(index in prev)) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Briefing banner */}
      {fromBriefing && aiDrafted && isEditable && (
        <Card className="border-l-4 border-l-accent bg-accent/5">
          <CardContent className="py-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <span className="text-sm">🧠</span>
            </div>
            <div>
              <p className="text-sm font-medium text-text">
                This note was pre-seeded from your intelligence briefing
              </p>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                The Assessment and Plan already incorporate your talking points
                and risk flags. Review each section, use the AI refine buttons to
                adjust, then sign when ready.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status + AI badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          tone={
            currentStatus === "finalized"
              ? "success"
              : currentStatus === "needs_review"
                ? "warning"
                : "neutral"
          }
        >
          {currentStatus}
        </Badge>
        {aiDrafted && <Badge tone="highlight">AI-drafted</Badge>}
        {aiConfidence !== null && (
          <Badge tone="info">
            Confidence {Math.round(aiConfidence * 100)}%
          </Badge>
        )}
        {fromBriefing && <Badge tone="accent">Briefing-seeded</Badge>}
      </div>

      {/* Note blocks */}
      <div className="space-y-3">
        {blocks.map((block, i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-5 space-y-2">
              {isEditable ? (
                <>
                  <input
                    type="text"
                    value={block.heading}
                    onChange={(e) => updateBlock(i, "heading", e.target.value)}
                    className="w-full font-display text-lg font-medium text-text tracking-tight bg-transparent border-0 border-b border-border/60 pb-1.5 focus:outline-none focus:border-accent transition-colors"
                    placeholder="Section heading"
                  />
                  <textarea
                    value={block.body}
                    onChange={(e) => updateBlock(i, "body", e.target.value)}
                    rows={Math.max(3, block.body.split("\n").length + 1)}
                    className="w-full text-sm text-text-muted leading-relaxed bg-transparent border border-border/40 rounded-md p-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all resize-y"
                    placeholder="Note content..."
                  />
                  {/* AI Refine buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-text-subtle uppercase tracking-wider mr-1">
                      AI:
                    </span>
                    {REFINE_OPTIONS.map((opt) => (
                      <button
                        key={opt.mode}
                        onClick={() => handleRefine(i, opt.mode)}
                        disabled={refiningIndex !== null}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                          refiningIndex === i
                            ? "bg-accent/20 text-accent animate-pulse"
                            : "bg-surface-muted text-text-subtle hover:bg-accent/10 hover:text-accent border border-border/40"
                        } disabled:opacity-50`}
                      >
                        <span className="font-mono text-[9px]">{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                    {refiningIndex === i && (
                      <span className="text-[10px] text-accent ml-1 animate-pulse">
                        Refining...
                      </span>
                    )}
                  </div>
                  {refineErrors[i] && (
                    <div
                      role="alert"
                      className="mt-2 flex items-start gap-2 rounded-md border border-highlight/30 bg-highlight-soft/50 px-3 py-2 text-[11px] text-[color:var(--highlight-hover)]"
                    >
                      <span aria-hidden="true" className="shrink-0 mt-0.5">⚠</span>
                      <span className="flex-1 leading-relaxed">
                        {refineErrors[i]}
                      </span>
                      <button
                        type="button"
                        onClick={() => dismissRefineError(i)}
                        aria-label="Dismiss"
                        className="shrink-0 text-text-subtle hover:text-text transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3 className="font-display text-lg font-medium text-text tracking-tight">
                    {block.heading}
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
                    {block.body}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action buttons */}
      {isEditable && (
        <div className="flex items-center gap-3 pt-2">
          <Button variant="secondary" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save draft"}
          </Button>
          <Button variant="primary" onClick={handleFinalize} disabled={isPending}>
            {isPending ? "Finalizing..." : "Finalize & sign"}
          </Button>
          {saveMessage && (
            <span className="text-sm text-text-muted">
              {scrubMessage(saveMessage)}
            </span>
          )}
        </div>
      )}

      {/* Finalized success state with coding suggestions */}
      {currentStatus === "finalized" && codingSuggestion && (
        <Card tone="ambient" className="mt-6">
          <CardContent className="pt-6">
            <h3 className="font-display text-lg font-medium text-text tracking-tight mb-3">
              Coding Suggestions
            </h3>
            {codingSuggestion.icd10 &&
              Array.isArray(codingSuggestion.icd10) &&
              codingSuggestion.icd10.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-text-subtle uppercase tracking-wider mb-2">
                    ICD-10 Codes
                  </p>
                  <ul className="space-y-1.5">
                    {codingSuggestion.icd10.map(
                      (
                        code: { code: string; label: string; confidence: number },
                        i: number
                      ) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Badge tone="accent">{code.code}</Badge>
                          <span className="text-text">{code.label}</span>
                          <span className="text-text-subtle text-xs">
                            ({Math.round(code.confidence * 100)}%)
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            {codingSuggestion.emLevel && (
              <div className="mb-3">
                <p className="text-xs font-medium text-text-subtle uppercase tracking-wider mb-1">
                  E/M Level
                </p>
                <Badge tone="info">{codingSuggestion.emLevel}</Badge>
              </div>
            )}
            {codingSuggestion.rationale && (
              <div>
                <p className="text-xs font-medium text-text-subtle uppercase tracking-wider mb-1">
                  Rationale
                </p>
                <p className="text-sm text-text-muted leading-relaxed">
                  {codingSuggestion.rationale}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentStatus === "finalized" && !codingSuggestion && (
        <Card className="mt-6">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-text-muted">
              Note finalized. Coding suggestions will appear once the Coding Readiness Agent processes this note.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
