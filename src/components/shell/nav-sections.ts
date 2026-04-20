/**
 * Pure helpers for the grouped sidebar nav.
 *
 * These are framework-free so they can be covered by the node-only vitest
 * suite. The AppShell + MobileNav consume them at render time.
 *
 *   NavItem        — a single leaf link with legacy count + optional semantic badge.
 *   NavSection     — a group of items with an optional label + default state.
 *   NavBadge       — re-exported from lib/domain/nav-badges (severity + context).
 *   Helpers        — aggregate counts, aggregate semantic badge, smart-collapse
 *                    resolution, localStorage merge, pathname matching.
 */

import { aggregateBadge, type NavBadge } from "@/lib/domain/nav-badges";
import type { NavAgentActivity } from "@/lib/domain/nav-agent-activity";

export type { NavBadge } from "@/lib/domain/nav-badges";

export type CountTone = "highlight" | "danger" | "accent";

export interface NavItem {
  label: string;
  href: string;
  icon?: unknown;
  /** Legacy numeric badge — still rendered if `badge` is not set. */
  count?: number;
  countTone?: CountTone;
  /** Semantic badge — preferred. Takes precedence over count/countTone. */
  badge?: NavBadge | null;
  /**
   * Ambient "an AI agent is actively working here" indicator. Additive —
   * renders alongside the existing count / semantic badge, not in place of it.
   * Populated by the layout by calling `getActiveAgentActivity()`; null/undef
   * means no agent is currently running for this nav entry.
   */
  activity?: NavAgentActivity | null;
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
  /**
   * Optional explicit semantic badge for the group. When omitted, the
   * aggregate of the child items' `badge` fields is used.
   */
  badge?: NavBadge | null;
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
 * Legacy count-based aggregate: sum the numeric counts on a section's items
 * and pick the loudest tone among items that actually contribute a non-zero
 * count. Returns null if the section has no live count badges worth showing.
 *
 * Kept for backward compatibility on items still using the count/countTone
 * fields. New nav items should use `badge` (semantic) and rely on
 * `getSectionBadge` below.
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
 * Semantic badge for a section header. If the section has an explicit
 * `badge`, use it; otherwise aggregate the items' `badge` fields via the
 * severity-ranked rollup in `lib/domain/nav-badges`.
 *
 * Returns null when the entire section is silent-green ("ok") — the header
 * badge slot stays empty.
 */
export function getSectionBadge(section: NavSection): NavBadge | null {
  if (section.badge !== undefined) return section.badge;
  return aggregateBadge(section.items.map((i) => i.badge ?? null));
}

/**
 * Type guard so a renderer can walk a mixed list of items and sections.
 */
export function isNavSection(node: NavItem | NavSection): node is NavSection {
  return Array.isArray((node as NavSection).items);
}

export type NavNode = NavItem | NavSection;

/**
 * Does the current pathname match any item in the given section?
 *
 * Match rules:
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
 *   3. Else if the user explicitly persisted a choice, honor it.
 *   4. Else fall back to section.defaultCollapsed (default: false).
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
 */
export function collapseStorageKey(label: string): string {
  return `nav:group:${label}:collapsed`;
}

/**
 * Read persisted collapsed state from any localStorage-like getter.
 * Missing, malformed, or non-boolean values are omitted.
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
 * Merge a user toggle into an existing resolved map. Pure — never mutates.
 */
export function toggleCollapseState(
  state: Record<string, boolean>,
  label: string,
): Record<string, boolean> {
  return { ...state, [label]: !state[label] };
}

/**
 * Flatten sections back to a plain item list.
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
