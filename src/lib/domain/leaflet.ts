// Leaflet — After Visit Summary types + assembly helpers
// EMR-148 / EMR-149

import type { NoteBlock } from "@/lib/domain/notes";

export interface LeafletVisit {
  date: string;
  provider: string;
  modality: string;
  reason: string | null;
}

export interface LeafletMedication {
  name: string;
  dosage: string;
  instructions: string | null;
  type: "cannabis" | "prescription" | "supplement" | "otc";
}

export interface LeafletData {
  patientName: string;
  patientDOB: string | null;
  allergies: string[];
  visit: LeafletVisit;
  discussed: string;
  carePlan: LeafletMedication[];
  carePlanNotes: string;
  nextSteps: string[];
  followUp: string;
  narrativeSource: string; // raw text for AI narrative generation
  generatedAt: string;
}

/** Extract text from note blocks by type */
export function extractNoteSection(blocks: unknown, type: string): string {
  if (!Array.isArray(blocks)) return "";
  const typed = blocks as NoteBlock[];
  const block = typed.find((b) => b.type === type);
  return block?.body?.trim() ?? "";
}

/** Extract action items from plan text (lines starting with - or •) */
export function extractActionItems(planText: string): string[] {
  if (!planText) return [];
  return planText
    .split("\n")
    .map((line) => line.replace(/^[\s\-•*]+/, "").trim())
    .filter((line) => line.length > 5 && line.length < 200);
}

/** Build a deterministic narrative from visit data */
export function buildDeterministicNarrative(data: LeafletData): string {
  const parts: string[] = [];

  parts.push(
    `Today ${data.patientName.split(" ")[0]} had a ${data.visit.modality.replace("_", "-")} visit` +
    (data.visit.reason ? ` for ${data.visit.reason.toLowerCase()}` : "") +
    "."
  );

  if (data.discussed) {
    const summary = data.discussed.length > 150
      ? data.discussed.slice(0, 147) + "..."
      : data.discussed;
    parts.push(`We discussed: ${summary}`);
  }

  if (data.carePlan.length > 0) {
    const medNames = data.carePlan.slice(0, 3).map((m) => m.name).join(", ");
    parts.push(`Current medications include ${medNames}.`);
  }

  if (data.nextSteps.length > 0) {
    parts.push(`Next steps: ${data.nextSteps[0]}.`);
  }

  parts.push(data.followUp);

  return parts.join(" ");
}
