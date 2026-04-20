/**
 * Pure helpers for the grouped sidebar nav.
 *
 * These are framework-free so they can be covered by the node-only vitest
 * suite. The AppShell + MobileNav consume them at render time.
 *
 *   NavItem     — a single leaf link (existing shape, unchanged).
 *   NavSection  — a group of items with an optional label + default state.
 *   Helpers     — aggregate counts, smart-collapse resolution, localStorage
 *                 merge. Every helper is pure: given the same inputs it
 *                 returns the same output, no side effects.
 */

export type CountTone = "highlight" | "danger" | "accent";

export interface NavItem {
  label: string;
  href: string;
  icon?: unknown;
  count?: number;
  countTone?: CountTone;
}

export interface NavSection {
  /**
   * Group header label. If undefined, the section renders as a Tier 1 block
   * with no group chrome (items appear flush at the top of the rail).
   */
  label?: string;
  items: NavItem[];
  /**
   * Default collapse state on first visit, used when there is no persisted
   * state and the current pathname does not match any item in the section.
   * Defaults to false (expanded).
   */
  defaultCollapsed?: boolean;
}

/**
 * Tones ordered from loudest to quietest. When rolling up a group's items,
 * the header inherits the loudest tone of any item that has a non-zero count.
 */
const TONE_SEVERITY: Record<CountTone, number> = {
  danger: 3,
  accent: 2,
  highlight: 1,
};

export interface AggregateBadge {
  count: number;
  tone: CountTone;
}

/**
 * Sum the counts on a section's items and pick the loudest tone among
 * items that actually contribute a non-zero count. Returns null if the
 * section has no live badges worth showing.
 */
export function aggregateSectionBadge(section: NavSection): AggregateBadge | null {
  let total = 0;
  let tone: CountTone = "highlight";
  let toneSeverity = 0;
  for (const item of section.items) {
    const n = item.count ?? 0;
    if (n <= 0) continue;
    total += n;
    const itemTone = item.countTone ?? "highlight";
    const severity = TONE_SEVERITY[itemTone];
    if (severity > toneSeverity) {
      tone = itemTone;
      toneSeverity = severity;
    }
  }
  if (total <= 0) return null;
  return { count: total, tone };
}

/**
 * Does the current pathname match any item in the given section?
 *
 * Match rules (intentionally strict to avoid "everything under /clinic"
 * lighting up every section):
 *   • exact pathname === item.href, OR
 *   • pathname starts with `item.href + "/"`.
 *
 * Root-like hrefs ("/clinic", "/ops", "/portal") only match themselves
 * exactly so the Overview/Today items don't hijack every section.
 */
export function sectionContainsPath(section: NavSection, pathname: string): boolean {
  for (const item of section.items) {
    if (itemMatchesPath(item.href, pathname)) return true;
  }
  return false;
}

export function itemMatchesPath(href: string, pathname: string): boolean {
  if (href === pathname) return true;
  // Short top-level hrefs only match exactly — otherwise "/clinic" would
  // claim every child route in the clinician tree.
  const segments = href.split("/").filter(Boolean);
  if (segments.length <= 1) return false;
  return pathname.startsWith(href + "/");
}

export interface ResolveCollapseInput {
  sections: NavSection[];
  pathname: string;
  /**
   * Map of group label → persisted collapsed state (true = collapsed). Keys
   * absent from the map mean "never set by the user, use default".
   */
  persisted: Record<string, boolean>;
}

/**
 * Resolve initial collapsed state for every labeled section.
 *
 * Rules, in order:
 *   1. A section with no label is never collapsible — skipped.
 *   2. If the section contains the current pathname, force expanded.
 *      (This is the "follow me into the group I just clicked" rule.)
 *   3. Else if the user explicitly persisted a choice, honor it.
 *   4. Else fall back to section.defaultCollapsed (default: false).
 *
 * Returns a map keyed by section label → collapsed boolean.
 */
export function resolveInitialCollapseState(
  input: ResolveCollapseInput,
): Record<string, boolean> {
  const { sections, pathname, persisted } = input;
  const out: Record<string, boolean> = {};
  for (const section of sections) {
    if (!section.label) continue;
    if (sectionContainsPath(section, pathname)) {
      out[section.label] = false;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(persisted, section.label)) {
      out[section.label] = persisted[section.label];
      continue;
    }
    out[section.label] = section.defaultCollapsed ?? false;
  }
  return out;
}

/**
 * localStorage key convention: `nav:group:<label>:collapsed`.
 * Exported so both the renderer and any test can reach it.
 */
export function collapseStorageKey(label: string): string {
  return `nav:group:${label}:collapsed`;
}

/**
 * Given a raw localStorage-like getter, read the persisted collapsed state
 * for every labeled section into a plain map.
 *
 * The getter is abstracted so tests can pass a stub. Missing, malformed, or
 * non-boolean values are ignored (the key is simply absent from the output).
 */
export function readPersistedCollapseState(
  sections: NavSection[],
  getItem: (key: string) => string | null,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const section of sections) {
    if (!section.label) continue;
    const raw = getItem(collapseStorageKey(section.label));
    if (raw === "true") out[section.label] = true;
    else if (raw === "false") out[section.label] = false;
  }
  return out;
}

/**
 * Merge a user toggle into an existing resolved map. Pure so tests can
 * verify we never mutate the input.
 */
export function toggleCollapseState(
  state: Record<string, boolean>,
  label: string,
): Record<string, boolean> {
  return { ...state, [label]: !state[label] };
}

/**
 * Flatten a set of sections back to a plain item list — useful when the
 * consumer (e.g. a test, or a legacy surface) just wants every link.
 */
export function flattenSectionItems(sections: NavSection[]): NavItem[] {
  const out: NavItem[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      out.push(item);
    }
  }
  return out;
}
