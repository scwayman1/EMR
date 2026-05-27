/**
 * ADA / WCAG 2.1 AA compliance audit — EMR-029
 *
 * A pragmatic in-house auditor we can run against rendered HTML (in
 * Playwright tests, in the dev server, or against a saved snapshot) to
 * surface the most common WCAG failures. This is intentionally not a
 * replacement for axe-core — it's a deterministic, dependency-free
 * baseline so CI can fail fast when a regression slips in (a missing alt
 * tag, a low-contrast button, an unlabeled input).
 *
 * The auditor is broken into pure rules so each can be unit-tested and
 * extended independently. Each rule operates on either an HTMLElement
 * (when run in the browser via the AppShell dev overlay) or on a parsed
 * cheerio document (when run server-side in tests). To keep this file
 * server-safe, we accept a thin adapter (`AuditNode`) instead of binding
 * to a particular DOM impl.
 */

export type WCAGLevel = "A" | "AA" | "AAA";
export type Severity = "error" | "warning" | "info";

export interface AuditFinding {
  ruleId: string;
  severity: Severity;
  wcag: { level: WCAGLevel; criterion: string };
  /** Short user-facing message. */
  message: string;
  /** Element snippet (truncated) for reporting. */
  snippet?: string;
  /** CSS-ish path so devs can grep for the offender. */
  selector?: string;
}

export interface AuditNode {
  tag: string;
  attrs: Record<string, string>;
  text: string;
  children: AuditNode[];
  /** Optional computed selector for diagnostics. */
  selector?: string;
}

export interface AuditReport {
  findings: AuditFinding[];
  totals: {
    error: number;
    warning: number;
    info: number;
  };
  passed: boolean;
}

// ---------------------------------------------------------------------------
// Rule definitions
// ---------------------------------------------------------------------------

interface Rule {
  id: string;
  wcag: { level: WCAGLevel; criterion: string };
  description: string;
  /** Returns the findings produced by this rule. */
  check: (node: AuditNode) => AuditFinding[];
}

function snip(node: AuditNode, max = 80): string {
  const attrs = Object.entries(node.attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  const open = `<${node.tag}${attrs ? " " + attrs : ""}>`;
  return open.length <= max ? open : open.slice(0, max - 1) + "…";
}

function walk(node: AuditNode, fn: (n: AuditNode) => void) {
  fn(node);
  for (const c of node.children) walk(c, fn);
}

const IMG_ALT_RULE: Rule = {
  id: "img-alt",
  wcag: { level: "A", criterion: "1.1.1" },
  description: "Non-decorative images need alt text.",
  check(root) {
    const out: AuditFinding[] = [];
    walk(root, (n) => {
      if (n.tag !== "img") return;
      // Decorative images are flagged with alt="" or role="presentation".
      const role = n.attrs.role;
      if (role === "presentation" || role === "none") return;
      if (typeof n.attrs.alt === "string") return;
      out.push({
        ruleId: "img-alt",
        severity: "error",
        wcag: { level: "A", criterion: "1.1.1" },
        message: "<img> is missing an alt attribute.",
        snippet: snip(n),
        selector: n.selector,
      });
    });
    return out;
  },
};

const FORM_LABEL_RULE: Rule = {
  id: "form-label",
  wcag: { level: "A", criterion: "1.3.1" },
  description:
    "Form inputs need an associated <label>, aria-label, or aria-labelledby.",
  check(root) {
    const out: AuditFinding[] = [];
    const labelTargets = new Set<string>();
    walk(root, (n) => {
      if (n.tag === "label" && n.attrs.for) labelTargets.add(n.attrs.for);
    });
    walk(root, (n) => {
      if (!["input", "select", "textarea"].includes(n.tag)) return;
      const type = n.attrs.type;
      if (n.tag === "input" && (type === "hidden" || type === "submit" || type === "button" || type === "image")) {
        return;
      }
      const id = n.attrs.id;
      const hasLabel = id ? labelTargets.has(id) : false;
      const hasAria =
        Boolean(n.attrs["aria-label"]) || Boolean(n.attrs["aria-labelledby"]);
      const hasTitle = Boolean(n.attrs.title);
      if (hasLabel || hasAria || hasTitle) return;
      out.push({
        ruleId: "form-label",
        severity: "error",
        wcag: { level: "A", criterion: "1.3.1" },
        message: `<${n.tag}> has no accessible name.`,
        snippet: snip(n),
        selector: n.selector,
      });
    });
    return out;
  },
};

const BUTTON_NAME_RULE: Rule = {
  id: "button-name",
  wcag: { level: "A", criterion: "4.1.2" },
  description: "Buttons must expose an accessible name.",
  check(root) {
    const out: AuditFinding[] = [];
    walk(root, (n) => {
      if (n.tag !== "button") return;
      const text = n.text.trim();
      const hasAria =
        Boolean(n.attrs["aria-label"]) || Boolean(n.attrs["aria-labelledby"]);
      if (text.length > 0 || hasAria) return;
      out.push({
        ruleId: "button-name",
        severity: "error",
        wcag: { level: "A", criterion: "4.1.2" },
        message: "<button> has no accessible name (no text, no aria-label).",
        snippet: snip(n),
        selector: n.selector,
      });
    });
    return out;
  },
};

const LINK_NAME_RULE: Rule = {
  id: "link-name",
  wcag: { level: "A", criterion: "2.4.4" },
  description: "Links need descriptive text or aria-label.",
  check(root) {
    const out: AuditFinding[] = [];
    walk(root, (n) => {
      if (n.tag !== "a") return;
      const text = n.text.trim();
      const hasAria =
        Boolean(n.attrs["aria-label"]) || Boolean(n.attrs["aria-labelledby"]);
      if ((text.length > 0 && text.toLowerCase() !== "click here") || hasAria) {
        return;
      }
      out.push({
        ruleId: "link-name",
        severity: text === "click here" ? "warning" : "error",
        wcag: { level: "A", criterion: "2.4.4" },
        message:
          text === "click here"
            ? 'Link text "click here" is not descriptive out of context.'
            : "<a> has no accessible name.",
        snippet: snip(n),
        selector: n.selector,
      });
    });
    return out;
  },
};

const HEADING_ORDER_RULE: Rule = {
  id: "heading-order",
  wcag: { level: "AA", criterion: "1.3.1" },
  description: "Heading levels should not skip (h1 → h3).",
  check(root) {
    const out: AuditFinding[] = [];
    let last = 0;
    walk(root, (n) => {
      const m = /^h([1-6])$/.exec(n.tag);
      if (!m) return;
      const level = Number(m[1]);
      if (last && level > last + 1) {
        out.push({
          ruleId: "heading-order",
          severity: "warning",
          wcag: { level: "AA", criterion: "1.3.1" },
          message: `Heading jumps from h${last} to h${level}.`,
          snippet: snip(n),
          selector: n.selector,
        });
      }
      last = level;
    });
    return out;
  },
};

const LANG_RULE: Rule = {
  id: "html-lang",
  wcag: { level: "A", criterion: "3.1.1" },
  description: "The root <html> needs a lang attribute.",
  check(root) {
    if (root.tag !== "html") return [];
    if (root.attrs.lang) return [];
    return [
      {
        ruleId: "html-lang",
        severity: "error",
        wcag: { level: "A", criterion: "3.1.1" },
        message: "<html> is missing a lang attribute.",
        snippet: snip(root),
        selector: root.selector,
      },
    ];
  },
};

const TARGET_SIZE_RULE: Rule = {
  id: "target-size",
  wcag: { level: "AA", criterion: "2.5.5" },
  description:
    "Interactive elements should be at least 24×24 CSS pixels (advisory).",
  check(root) {
    const out: AuditFinding[] = [];
    walk(root, (n) => {
      if (!["a", "button", "input"].includes(n.tag)) return;
      // We can't measure pixels from a static node, so we only flag
      // explicit inline width/height attributes that are too small.
      const w = Number(n.attrs.width);
      const h = Number(n.attrs.height);
      if (
        Number.isFinite(w) &&
        Number.isFinite(h) &&
        (w < 24 || h < 24)
      ) {
        out.push({
          ruleId: "target-size",
          severity: "warning",
          wcag: { level: "AA", criterion: "2.5.5" },
          message: `Interactive element has inline size ${w}×${h} below 24×24.`,
          snippet: snip(n),
          selector: n.selector,
        });
      }
    });
    return out;
  },
};

const ARIA_VALID_ROLE_RULE: Rule = {
  id: "aria-valid-role",
  wcag: { level: "A", criterion: "4.1.2" },
  description: "role= attributes must be a known ARIA role.",
  check(root) {
    const out: AuditFinding[] = [];
    walk(root, (n) => {
      const role = n.attrs.role;
      if (!role) return;
      if (!VALID_ARIA_ROLES.has(role)) {
        out.push({
          ruleId: "aria-valid-role",
          severity: "error",
          wcag: { level: "A", criterion: "4.1.2" },
          message: `Unknown ARIA role: "${role}".`,
          snippet: snip(n),
          selector: n.selector,
        });
      }
    });
    return out;
  },
};

const VALID_ARIA_ROLES = new Set([
  "alert",
  "alertdialog",
  "application",
  "article",
  "banner",
  "button",
  "checkbox",
  "complementary",
  "contentinfo",
  "dialog",
  "document",
  "feed",
  "figure",
  "form",
  "grid",
  "gridcell",
  "group",
  "heading",
  "img",
  "link",
  "list",
  "listbox",
  "listitem",
  "main",
  "marquee",
  "math",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "navigation",
  "none",
  "note",
  "option",
  "presentation",
  "progressbar",
  "radio",
  "radiogroup",
  "region",
  "row",
  "rowgroup",
  "rowheader",
  "scrollbar",
  "search",
  "searchbox",
  "separator",
  "slider",
  "spinbutton",
  "status",
  "switch",
  "tab",
  "table",
  "tablist",
  "tabpanel",
  "term",
  "textbox",
  "timer",
  "toolbar",
  "tooltip",
  "tree",
  "treegrid",
  "treeitem",
]);

export const RULES: Rule[] = [
  IMG_ALT_RULE,
  FORM_LABEL_RULE,
  BUTTON_NAME_RULE,
  LINK_NAME_RULE,
  HEADING_ORDER_RULE,
  LANG_RULE,
  TARGET_SIZE_RULE,
  ARIA_VALID_ROLE_RULE,
];

// ---------------------------------------------------------------------------
// Contrast checking (WCAG 1.4.3 AA — 4.5:1 normal text, 3:1 large text)
// ---------------------------------------------------------------------------

/** Parse "#rrggbb" / "#rgb" / "rgb(r,g,b)" → [r, g, b] in 0–255. */
export function parseColor(input: string): [number, number, number] | null {
  const s = input.trim().toLowerCase();
  if (s.startsWith("#")) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0]! + hex[0]!, 16),
        parseInt(hex[1]! + hex[1]!, 16),
        parseInt(hex[2]! + hex[2]!, 16),
      ];
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
  }
  const rgbMatch = /rgba?\(([^)]+)\)/.exec(s);
  if (rgbMatch) {
    const parts = rgbMatch[1]!.split(",").map((p) => Number(p.trim()));
    if (parts.length >= 3 && parts.every((n) => Number.isFinite(n))) {
      return [parts[0]!, parts[1]!, parts[2]!];
    }
  }
  return null;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Compute the WCAG contrast ratio between two CSS colors. */
export function contrastRatio(fg: string, bg: string): number | null {
  const f = parseColor(fg);
  const b = parseColor(bg);
  if (!f || !b) return null;
  const lf = relativeLuminance(f);
  const lb = relativeLuminance(b);
  const [hi, lo] = lf > lb ? [lf, lb] : [lb, lf];
  return (hi + 0.05) / (lo + 0.05);
}

export interface ContrastInput {
  foreground: string;
  background: string;
  /** True for ≥18pt text or ≥14pt bold — relaxes ratio to 3:1. */
  largeText?: boolean;
}

export interface ContrastResult {
  ratio: number;
  required: number;
  passes: boolean;
}

export function checkContrast(input: ContrastInput): ContrastResult | null {
  const ratio = contrastRatio(input.foreground, input.background);
  if (ratio == null) return null;
  const required = input.largeText ? 3 : 4.5;
  return { ratio, required, passes: ratio >= required };
}

// ---------------------------------------------------------------------------
// Top-level audit entry
// ---------------------------------------------------------------------------

export interface AuditOptions {
  /** Rule ids to skip — useful when a rule is too noisy for a surface. */
  exclude?: string[];
}

export function audit(root: AuditNode, options: AuditOptions = {}): AuditReport {
  const exclude = new Set(options.exclude ?? []);
  const findings: AuditFinding[] = [];
  for (const rule of RULES) {
    if (exclude.has(rule.id)) continue;
    findings.push(...rule.check(root));
  }
  const totals = { error: 0, warning: 0, info: 0 };
  for (const f of findings) totals[f.severity] += 1;
  return { findings, totals, passed: totals.error === 0 };
}

/**
 * Adapter: lift a real DOM element into the AuditNode tree the audit runs on.
 * Available client-side via `document.documentElement`. Keeps the audit
 * usable as both a runtime overlay and a CI-time check.
 */
export function fromDomElement(el: Element): AuditNode {
  const attrs: Record<string, string> = {};
  for (const a of Array.from(el.attributes)) attrs[a.name] = a.value;
  const children: AuditNode[] = [];
  for (const c of Array.from(el.children)) children.push(fromDomElement(c));
  return {
    tag: el.tagName.toLowerCase(),
    attrs,
    text: el.textContent ?? "",
    children,
    selector:
      el.id
        ? `#${el.id}`
        : el.tagName.toLowerCase() +
          (el.classList.length > 0 ? "." + Array.from(el.classList).join(".") : ""),
  };
}
