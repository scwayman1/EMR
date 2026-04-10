"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { saveNoteBlocks, saveAndFinalizeNote } from "./actions";
import { APSO_ORDER, NOTE_BLOCK_LABELS } from "@/lib/domain/notes";
import type { NoteBlockType } from "@/lib/domain/notes";

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

  return (
    <div className="space-y-4">
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
            <span className="text-sm text-text-muted">{saveMessage}</span>
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
