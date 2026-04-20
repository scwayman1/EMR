/**
 * Pure, side-effect-free helpers used by the ⌘K command palette.
 *
 * Lives in `lib/domain` (not `components/ui`) so vitest can import it under
 * the `node` environment without dragging React, Next router, or any
 * "use client" / "use server" boundary into the test runner.
 *
 * The palette component re-exports these — keep this module the source of
 * truth for the Command type union and the filtering / grouping logic.
 */

import type {
  PaletteActionDefinition,
  PaletteRole,
} from "./palette-actions";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export type CommandKind = "navigation" | "action" | "patient";

export interface NavigationCommand {
  kind: "navigation";
  id: string;
  label: string;
  href: string;
  icon?: string;
  hint?: string;
  keywords?: string[];
  roles?: PaletteRole[];
}

export interface ActionCommand {
  kind: "action";
  id: string;
  label: string;
  description?: string;
  icon?: string;
  keywords?: string[];
  roles?: PaletteRole[];
  status: "real" | "stub";
  run: (ctx: {
    router: AppRouterInstance;
    closePalette: () => void;
  }) => Promise<void> | void;
}

export interface PatientCommand {
  kind: "patient";
  id: string;
  label: string;
  patientId: string;
  description?: string;
}

export type Command = NavigationCommand | ActionCommand | PatientCommand;

/**
 * Lightweight subsequence-fuzzy score: returns a number where higher is
 * better, or -Infinity if the query characters aren't present in order.
 */
export function fuzzyScore(query: string, target: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 1000 - t.indexOf(q);
  let qi = 0;
  let lastHit = -1;
  let runs = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      if (lastHit !== i - 1) runs++;
      lastHit = i;
      qi++;
    }
  }
  if (qi < q.length) return -Infinity;
  return 100 - runs * 5 - t.length * 0.1;
}

/** Build the haystack string used by fuzzyScore for a given command. */
export function commandHaystack(cmd: Command): string {
  switch (cmd.kind) {
    case "navigation":
      return [cmd.label, cmd.hint ?? "", ...(cmd.keywords ?? [])]
        .join(" ")
        .toLowerCase();
    case "action":
      return [cmd.label, cmd.description ?? "", ...(cmd.keywords ?? [])]
        .join(" ")
        .toLowerCase();
    case "patient":
      return `${cmd.label} ${cmd.description ?? ""}`.toLowerCase();
  }
}

/**
 * Filter & rank a flat list of commands by the fuzzy score against `query`.
 * Empty query returns the input order untouched.
 */
export function filterCommands(commands: Command[], query: string): Command[] {
  const trimmed = query.trim();
  if (!trimmed) return commands.slice();
  const scored = commands
    .map((cmd) => ({ cmd, score: fuzzyScore(trimmed, commandHaystack(cmd)) }))
    .filter((c) => c.score > -Infinity);
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.cmd);
}

/** Strip nav commands the current role isn't allowed to see. */
export function filterNavByRole(
  nav: NavigationCommand[],
  roles: PaletteRole[],
): NavigationCommand[] {
  return nav.filter((n) => {
    if (!n.roles || n.roles.length === 0) return true;
    return n.roles.some((r) => roles.includes(r));
  });
}

/**
 * Group commands into render sections in the canonical order:
 *   Patients → Actions → Navigate.
 * Sections with zero items are omitted.
 */
export function groupCommands(
  commands: Command[],
): { kind: CommandKind; label: string; items: Command[] }[] {
  const buckets: Record<CommandKind, Command[]> = {
    patient: [],
    action: [],
    navigation: [],
  };
  for (const c of commands) buckets[c.kind].push(c);
  const out: { kind: CommandKind; label: string; items: Command[] }[] = [];
  if (buckets.patient.length)
    out.push({ kind: "patient", label: "Patients", items: buckets.patient });
  if (buckets.action.length)
    out.push({ kind: "action", label: "Actions", items: buckets.action });
  if (buckets.navigation.length)
    out.push({
      kind: "navigation",
      label: "Navigate",
      items: buckets.navigation,
    });
  return out;
}

/** Convert an action definition to a typed ActionCommand. */
export function actionToCommand(a: PaletteActionDefinition): ActionCommand {
  return {
    kind: "action",
    id: a.id,
    label: a.label,
    description: a.description,
    icon: a.icon,
    keywords: a.keywords,
    roles: a.roles,
    status: a.status,
    run: a.run,
  };
}

/**
 * Debounced async fn wrapper. Returns a function with the same signature
 * as `fn` plus a `cancel` method. Each new call resets the wait timer; the
 * resolved promise from the most recent call resolves with the result, or
 * rejects when superseded.
 *
 * Exported so the palette UI and tests can both verify the timing behavior.
 */
export function debounceAsync<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
  waitMs: number,
): ((...args: Args) => Promise<R>) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingReject: ((reason: unknown) => void) | null = null;

  const wrapped = (...args: Args): Promise<R> => {
    if (timer) {
      clearTimeout(timer);
      pendingReject?.(new Error("debounced: superseded"));
    }
    return new Promise<R>((resolve, reject) => {
      pendingReject = reject;
      timer = setTimeout(() => {
        timer = null;
        pendingReject = null;
        fn(...args).then(resolve, reject);
      }, waitMs);
    });
  };
  wrapped.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingReject?.(new Error("debounced: cancelled"));
    pendingReject = null;
  };
  return wrapped;
}
