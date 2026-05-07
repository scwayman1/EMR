// Pure helper for the wizard "diff banner" used by EMR-424 steps 6, 7, and 8.
//
// Given the specialty's defaults and the admin's current selection, return
// the IDs that were added (present in current but not defaults) and removed
// (present in defaults but not current). Order is stable: results sort by
// the order each id first appears in `current` (added) or `defaults`
// (removed) so the banner reads predictably.
//
// Single source of truth — keep this pure. No I/O, no React. The three
// step components import this directly and any future audit-log writer
// can reuse it without spinning up a renderer.

export type TemplateIdDiff = {
  added: string[];
  removed: string[];
};

export function diffTemplateIds(
  defaults: string[],
  current: string[],
): TemplateIdDiff {
  const defaultsSet = new Set(defaults);
  const currentSet = new Set(current);

  const added: string[] = [];
  for (const id of current) {
    if (!defaultsSet.has(id) && !added.includes(id)) {
      added.push(id);
    }
  }

  const removed: string[] = [];
  for (const id of defaults) {
    if (!currentSet.has(id) && !removed.includes(id)) {
      removed.push(id);
    }
  }

  return { added, removed };
}

/** Convenience: true when the diff is non-empty. */
export function hasDiff(diff: TemplateIdDiff): boolean {
  return diff.added.length > 0 || diff.removed.length > 0;
}
