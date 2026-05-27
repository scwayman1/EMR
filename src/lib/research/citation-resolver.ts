/**
 * EMR-179 — PubMed / DOI citation resolver.
 *
 * Single source of truth for turning a citation (PMID, DOI, or title)
 * into the right hyperlink, with consistent link attributes for opening
 * in a new tab.
 *
 * Anywhere we render a research article citation in the EMR — public
 * education page, ChatCB, patient education sheet, clinician research
 * tab — should resolve through this module so the link semantics stay
 * uniform.
 */

export interface CitationLike {
  /** Free-form title — used as a fallback search term. */
  title?: string;
  /** Numeric PubMed ID. */
  pmid?: string | number;
  /** DOI string (with or without "doi:" prefix). */
  doi?: string;
  /** Pre-resolved URL — wins over PMID/DOI if present. */
  url?: string;
}

const PUBMED_BASE = "https://pubmed.ncbi.nlm.nih.gov";
const DOI_BASE = "https://doi.org";

/**
 * Resolve a citation to its canonical hyperlink.
 *
 * Priority: explicit url > PMID > DOI > PubMed search by title. Returns
 * `null` only when no resolvable field is present.
 */
export function resolveCitationHref(c: CitationLike): string | null {
  if (c.url) return c.url;
  if (c.pmid !== undefined && c.pmid !== null && String(c.pmid).length > 0) {
    return `${PUBMED_BASE}/${String(c.pmid).trim()}/`;
  }
  if (c.doi) {
    const cleaned = c.doi.replace(/^doi:\s*/i, "").trim();
    if (cleaned) return `${DOI_BASE}/${cleaned}`;
  }
  if (c.title && c.title.trim()) {
    return `${PUBMED_BASE}/?term=${encodeURIComponent(c.title.trim())}`;
  }
  return null;
}

/**
 * Standard anchor attributes for an article link. Always opens in a new
 * tab with `noopener noreferrer` and an aria-label that includes the
 * destination so screen readers announce that a new tab will open.
 */
export function citationAnchorProps(
  c: CitationLike,
): {
  href: string;
  target: "_blank";
  rel: "noopener noreferrer";
  "aria-label": string;
} | null {
  const href = resolveCitationHref(c);
  if (!href) return null;
  const destination = c.pmid
    ? `PubMed (PMID ${c.pmid})`
    : c.doi
      ? "doi.org"
      : "PubMed search";
  const label = c.title
    ? `Open ${c.title} on ${destination} (new tab)`
    : `Open citation on ${destination} (new tab)`;
  return {
    href,
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": label,
  };
}

/**
 * Detect bracketed numeric citations in a body of text — `[1]`, `[2,3]`,
 * `[12-15]` — and return their start/end indices for later linkification.
 *
 * Used by the patient education sheet to overlay numeric citations onto
 * the rendered prose without requiring the agent to emit anchor tags.
 */
export interface CitationSpan {
  start: number;
  end: number;
  /** The raw matched text, e.g. "[3]" or "[2,4]". */
  raw: string;
  /** Numeric indexes referenced. 1-based, matching how readers count. */
  indexes: number[];
}

const BRACKET_RE = /\[(\d+(?:\s*[-,]\s*\d+)*)\]/g;

export function findCitationSpans(text: string): CitationSpan[] {
  const out: CitationSpan[] = [];
  for (const m of text.matchAll(BRACKET_RE)) {
    if (m.index === undefined) continue;
    const inner = m[1];
    const indexes: number[] = [];
    for (const part of inner.split(",")) {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [a, b] = trimmed.split("-").map((n) => parseInt(n, 10));
        if (Number.isFinite(a) && Number.isFinite(b) && a <= b) {
          for (let i = a; i <= b; i++) indexes.push(i);
        }
      } else {
        const n = parseInt(trimmed, 10);
        if (Number.isFinite(n)) indexes.push(n);
      }
    }
    out.push({ start: m.index, end: m.index + m[0].length, raw: m[0], indexes });
  }
  return out;
}
