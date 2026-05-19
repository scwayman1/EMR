/**
 * ClinicRibbon — top-of-page ribbon with four count tiles.
 *
 * EMR-645: three tiles (Patients today, Notes to sign, Approvals) must
 * render as clickable links with the correct hrefs. The Threads tile
 * intentionally retains its styling but renders as a non-interactive
 * element with no anchor — the messages product hasn't shipped a real
 * landing page yet, so we don't want users to click into a dead end.
 *
 * Vitest in this repo runs in a node environment (see vitest.config.mts),
 * so we inspect the React element tree directly instead of mounting into
 * a DOM. Same approach as src/app/(clinician)/clinic/page.test.tsx.
 */
import { describe, it, expect } from "vitest";
import util from "util";
import Link from "next/link";

import { ClinicRibbonTiles } from "./clinic-ribbon";

/**
 * Walk a React element tree, collecting every node that matches the
 * predicate. We need this because Vitest is configured for node — no
 * DOM, no @testing-library/react.
 *
 * When a node's `type` is a function component (e.g. `LinkedStatusDot`),
 * we invoke it with its props so the underlying anchor / link element
 * becomes visible to the predicate. This keeps the test honest about
 * the actual rendered output rather than just the top-level JSX shape.
 *
 * We deliberately skip components whose `$$typeof` is a forward_ref
 * (e.g. Next.js `Link`) — those are leaf-ish wrappers we want to match
 * on directly, not unwrap further.
 */
function findNodes(
  tree: any,
  match: (node: any) => boolean,
  acc: any[] = [],
): any[] {
  if (tree == null || tree === false) return acc;
  if (Array.isArray(tree)) {
    for (const child of tree) findNodes(child, match, acc);
    return acc;
  }
  if (typeof tree !== "object") return acc;

  if (match(tree)) acc.push(tree);

  // If the node is a function component (not a string tag, not a
  // forward_ref like Next's Link), invoke it to get its rendered tree.
  const isForwardRef =
    typeof tree.type === "object" &&
    tree.type !== null &&
    (tree.type as any).$$typeof?.toString?.() === "Symbol(react.forward_ref)";

  if (typeof tree.type === "function" && !isForwardRef) {
    try {
      const rendered = (tree.type as any)(tree.props ?? {});
      findNodes(rendered, match, acc);
    } catch {
      // Fall through to children walk below if the component errors.
    }
  }

  const children = tree.props?.children;
  if (children != null) findNodes(children, match, acc);
  return acc;
}

const TILE_PROPS = {
  todaysEncountersCount: 4,
  notesToSign: 2,
  approvalsCount: 1,
  threadsCount: 7,
};

describe("ClinicRibbonTiles (EMR-645)", () => {
  it("renders the three clickable tiles as next/link elements with correct hrefs", () => {
    const tree = ClinicRibbonTiles(TILE_PROPS);
    const links = findNodes(tree, (n) => n.type === Link);
    const hrefs = links.map((l) => l.props.href).sort();

    expect(hrefs).toEqual(
      ["/clinic/approvals", "/clinic/schedule", "/clinic/sign-off"].sort(),
    );
  });

  it("wires Patients today to /clinic/schedule", () => {
    const tree = ClinicRibbonTiles(TILE_PROPS);
    const links = findNodes(tree, (n) => n.type === Link);
    const patientsLink = links.find(
      (l) => l.props.href === "/clinic/schedule",
    );
    expect(patientsLink).toBeDefined();
    // The link's rendered content must include the count and the label.
    const dump = util.inspect(patientsLink, { depth: null });
    expect(dump).toContain("Patients today");
    expect(dump).toContain("4");
  });

  it("wires Notes to sign to /clinic/sign-off", () => {
    const tree = ClinicRibbonTiles(TILE_PROPS);
    const links = findNodes(tree, (n) => n.type === Link);
    const notesLink = links.find(
      (l) => l.props.href === "/clinic/sign-off",
    );
    expect(notesLink).toBeDefined();
    const dump = util.inspect(notesLink, { depth: null });
    expect(dump).toContain("Notes to sign");
  });

  it("wires Approvals to /clinic/approvals", () => {
    const tree = ClinicRibbonTiles(TILE_PROPS);
    const links = findNodes(tree, (n) => n.type === Link);
    const approvalsLink = links.find(
      (l) => l.props.href === "/clinic/approvals",
    );
    expect(approvalsLink).toBeDefined();
    const dump = util.inspect(approvalsLink, { depth: null });
    expect(dump).toContain("Approvals");
  });

  it("renders the Threads tile without an anchor element (not clickable)", () => {
    const tree = ClinicRibbonTiles(TILE_PROPS);

    // The Threads label must appear somewhere in the tree…
    const dump = util.inspect(tree, { depth: null });
    expect(dump).toContain("Threads");
    expect(dump).toContain("7"); // its count

    // …but no Link/anchor should target a threads or messages route.
    const links = findNodes(tree, (n) => n.type === Link);
    for (const link of links) {
      const href = String(link.props.href);
      expect(href).not.toMatch(/thread/i);
      expect(href).not.toMatch(/messages/i);
    }

    // Specifically: only three links, one each for the wired tiles.
    expect(links).toHaveLength(3);
  });

  it("Threads tile renders as a plain div, not an anchor", () => {
    const tree = ClinicRibbonTiles(TILE_PROPS);
    // Find any element whose dump contains the "Threads" label string.
    // The Threads tile container is a `div` per the implementation.
    const threadNodes = findNodes(tree, (n) => {
      const s = util.inspect(n, { depth: 3 });
      return (
        typeof n.type === "string" &&
        n.type === "div" &&
        s.includes("Threads")
      );
    });
    expect(threadNodes.length).toBeGreaterThan(0);
  });
});
