/**
 * EMR-746 — Semantic version diff for PracticeConfiguration snapshots.
 *
 * Renders human-readable field names (NOT raw JSON keys) so super_admins can
 * review a published-vs-draft (or rollback) diff at a glance without parsing
 * camelCase.
 *
 * Pure, dependency-free helper. The React surface lives at
 * `src/components/admin/version-diff-viewer.tsx` and only consumes the
 * `SemanticDiffEntry[]` produced here.
 */

import type { PracticeConfiguration } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type SemanticDiffKind = "added" | "removed" | "changed";

export type SemanticDiffSection =
  | "Specialty"
  | "Modalities"
  | "Workflows"
  | "Templates"
  | "Permissions"
  | "Migration"
  | "Branding"
  | "Other";

export interface SemanticDiffEntry {
  /** Grouping bucket — used by the viewer to render section cards. */
  section: SemanticDiffSection;
  /** Human label, e.g. "Care Model" or "Branding > Primary Color". */
  label: string;
  /** Raw key path (dot notation) — handy for stable React keys + analytics. */
  path: string;
  before: unknown;
  after: unknown;
  kind: SemanticDiffKind;
}

// ─────────────────────────────────────────────────────────────────────────────
// Label resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical human labels keyed by dot path. Top-level keys map to a label;
 * dotted keys (e.g. `branding.primaryColor`) map to a hierarchical label
 * separated by " > " so the UI can render breadcrumbs without parsing.
 */
export const FIELD_LABELS: Readonly<Record<string, string>> = Object.freeze({
  // Specialty bucket
  careModel: "Care Model",
  selectedSpecialty: "Specialty",
  selectedSpecialtyVersion: "Specialty Version",

  // Modalities
  enabledModalities: "Modalities",
  disabledModalities: "Disabled Modalities",

  // Templates
  workflowTemplateIds: "Workflow Templates",
  chartingTemplateIds: "Charting Templates",
  rolePermissionTemplateIds: "Role Permission Templates",
  physicianShellTemplateId: "Physician Shell Template",
  patientShellTemplateId: "Patient Shell Template",

  // Migration
  migrationProfileId: "Migration Profile",

  // Permissions
  regulatoryFlags: "Regulatory Flags",

  // Branding (nested)
  branding: "Branding",
  "branding.primaryColor": "Branding > Primary Color",
  "branding.logoUrl": "Branding > Logo URL",
  "branding.accentColor": "Branding > Accent Color",
  "branding.headerStyle": "Branding > Header Style",
});

/** Section bucket per top-level key. */
const SECTION_BY_TOP_KEY: Readonly<Record<string, SemanticDiffSection>> =
  Object.freeze({
    careModel: "Specialty",
    selectedSpecialty: "Specialty",
    selectedSpecialtyVersion: "Specialty",

    enabledModalities: "Modalities",
    disabledModalities: "Modalities",

    workflowTemplateIds: "Templates",
    chartingTemplateIds: "Templates",
    rolePermissionTemplateIds: "Templates",
    physicianShellTemplateId: "Templates",
    patientShellTemplateId: "Templates",

    migrationProfileId: "Migration",

    regulatoryFlags: "Permissions",

    branding: "Branding",
  });

function titleCase(key: string): string {
  // someBrandNewKey -> Some Brand New Key
  // snake_case_key  -> Snake Case Key
  return key
    .replace(/[_\-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\s+./g, (s) => s.toUpperCase());
}

/** Resolve a label for either a top-level key or a dotted nested path. */
export function resolveLabel(path: string): string {
  const exact = FIELD_LABELS[path];
  if (exact) return exact;

  // Nested fallback: "branding.somethingNew" → "Branding > Something New"
  if (path.includes(".")) {
    const parts = path.split(".");
    return parts.map((p) => FIELD_LABELS[p] ?? titleCase(p)).join(" > ");
  }
  return titleCase(path);
}

function resolveSection(path: string): SemanticDiffSection {
  const top = path.split(".")[0]!;
  return SECTION_BY_TOP_KEY[top] ?? "Other";
}

// ─────────────────────────────────────────────────────────────────────────────
// Diff engine
// ─────────────────────────────────────────────────────────────────────────────

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object") return false;
  if (Array.isArray(v)) return false;
  // Reject Dates, Maps, etc.
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    for (const k of ak) {
      if (!isEqual(a[k], b[k])) return false;
    }
    return true;
  }

  return false;
}

type AnyRecord = Record<string, unknown>;

function diffObjects(
  before: AnyRecord | undefined,
  after: AnyRecord | undefined,
  prefix: string,
  out: SemanticDiffEntry[],
): void {
  const allKeys = new Set<string>([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const beforeHas = before !== undefined && key in before;
    const afterHas = after !== undefined && key in after;

    const beforeVal = before?.[key];
    const afterVal = after?.[key];

    // Both sides have a nested plain object → recurse.
    if (isPlainObject(beforeVal) && isPlainObject(afterVal)) {
      diffObjects(beforeVal, afterVal, path, out);
      continue;
    }

    if (!beforeHas && afterHas) {
      out.push({
        section: resolveSection(path),
        label: resolveLabel(path),
        path,
        before: undefined,
        after: afterVal,
        kind: "added",
      });
      continue;
    }
    if (beforeHas && !afterHas) {
      out.push({
        section: resolveSection(path),
        label: resolveLabel(path),
        path,
        before: beforeVal,
        after: undefined,
        kind: "removed",
      });
      continue;
    }
    if (!isEqual(beforeVal, afterVal)) {
      out.push({
        section: resolveSection(path),
        label: resolveLabel(path),
        path,
        before: beforeVal,
        after: afterVal,
        kind: "changed",
      });
    }
  }
}

/**
 * Compute the semantic diff between two PracticeConfiguration snapshots.
 *
 * Returns one entry per differing field path. Nested plain objects (e.g.
 * `branding`) are walked recursively and reported with grouped sections
 * (so `branding.primaryColor` lands under the "Branding" section, not
 * dumped as a dotted path under "Other").
 */
export function semanticDiff(
  before: PracticeConfiguration | Record<string, unknown>,
  after: PracticeConfiguration | Record<string, unknown>,
): SemanticDiffEntry[] {
  const out: SemanticDiffEntry[] = [];
  diffObjects(before as AnyRecord, after as AnyRecord, "", out);
  return out;
}

/**
 * Convenience helper for the React viewer: group entries by section in a
 * stable, presentation-friendly order.
 */
export function groupBySection(
  entries: SemanticDiffEntry[],
): Array<{ section: SemanticDiffSection; rows: SemanticDiffEntry[] }> {
  const order: SemanticDiffSection[] = [
    "Specialty",
    "Modalities",
    "Workflows",
    "Templates",
    "Permissions",
    "Migration",
    "Branding",
    "Other",
  ];
  const map = new Map<SemanticDiffSection, SemanticDiffEntry[]>();
  for (const e of entries) {
    const arr = map.get(e.section) ?? [];
    arr.push(e);
    map.set(e.section, arr);
  }
  return order
    .filter((s) => map.has(s))
    .map((section) => ({ section, rows: map.get(section)! }));
}
