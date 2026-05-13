"use client";

// EMR-174 — clinical note template picker.
//
// Drop-in surface for the note editor. Renders an inline dropdown trigger
// that opens a menu of pre-built templates (Cannabis Initiation, Pain
// Follow-up, Mental Health Check-In, Medication Adjustment, etc.). On
// selection it emits a normalized `NoteBlock[]` so the editor can
// `setBlocks(...)` directly. Templates already contain the AI-friendly
// `[bracketed]` placeholders that the refine flow expands per-section.

import { useEffect, useRef, useState } from "react";
import {
  NOTE_TEMPLATES,
  type NoteTemplate,
} from "@/lib/domain/note-templates";
import type { NoteBlockType } from "@/lib/domain/notes";

export interface PickerBlock {
  type?: NoteBlockType;
  heading: string;
  body: string;
}

interface Props {
  onApply: (template: NoteTemplate, blocks: PickerBlock[]) => void;
  /** When true, the picker is disabled. Editor passes !isEditable. */
  disabled?: boolean;
  /** When true, the patient already has content; the picker shows a
   *  confirm step before replacing. Editor passes blocks.length > 0. */
  hasExistingContent?: boolean;
  className?: string;
}

const NOTE_BLOCK_TYPES: ReadonlySet<NoteBlockType> = new Set([
  "subjective",
  "objective",
  "assessment",
  "plan",
] as NoteBlockType[]);

function asBlockType(raw: string): NoteBlockType | undefined {
  return NOTE_BLOCK_TYPES.has(raw as NoteBlockType) ? (raw as NoteBlockType) : undefined;
}

export function NoteTemplatePicker({
  onApply,
  disabled,
  hasExistingContent,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<NoteTemplate | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && !confirming) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(null);
      }
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open, confirming]);

  const applyTemplate = (template: NoteTemplate) => {
    const blocks: PickerBlock[] = template.blocks.map((b) => ({
      type: asBlockType(b.type),
      heading: b.heading,
      body: b.body,
    }));
    onApply(template, blocks);
    setOpen(false);
    setConfirming(null);
  };

  const handlePick = (template: NoteTemplate) => {
    if (hasExistingContent) {
      setConfirming(template);
      return;
    }
    applyTemplate(template);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium border border-[var(--border)] bg-white hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        <span aria-hidden="true">📝</span>
        Apply template
        <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-30 mt-2 w-[320px] rounded-xl bg-white border border-[var(--border)] shadow-xl overflow-hidden"
        >
          <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-muted)]/60">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-subtle">
              Templates
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              AI fills the bracketed placeholders per section after you apply.
            </p>
          </div>
          <ul className="max-h-[360px] overflow-y-auto divide-y divide-[var(--border)]">
            {NOTE_TEMPLATES.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handlePick(t)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--surface-muted)]/40 transition-colors"
                >
                  <span className="text-lg leading-none mt-0.5" aria-hidden="true">{t.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-text leading-tight">{t.name}</p>
                    <p className="text-[11.5px] text-text-muted mt-0.5">
                      {t.visitType} · {t.blocks.length} sections
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirming && (
        <div className="absolute z-30 mt-2 w-[360px] rounded-xl bg-white border border-amber-300 shadow-xl p-4">
          <p className="text-[12px] font-semibold text-amber-700 mb-1">Replace current note?</p>
          <p className="text-[13px] text-text leading-snug mb-3">
            Applying <strong>{confirming.name}</strong> will overwrite the current
            blocks. Your AI refinements will be lost.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="text-[13px] px-3 h-8 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-muted)]/40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => applyTemplate(confirming)}
              className="text-[13px] px-3 h-8 rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-medium"
            >
              Replace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NoteTemplatePicker;
