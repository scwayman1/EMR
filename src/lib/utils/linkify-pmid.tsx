import * as React from "react";

const PMID_PATTERN = /(?:\(\s*)?PMID[:\s]*\s*(\d{4,10})(?:\s*\))?/gi;

/**
 * Convert any "(PMID: 12345678)" or "PMID 12345678" mention in plain text
 * into an anchor that opens the PubMed article in a new tab. Used by
 * education content that's authored as bare strings rather than markdown.
 */
export function linkifyPmid(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  PMID_PATTERN.lastIndex = 0;
  while ((match = PMID_PATTERN.exec(text)) !== null) {
    const [token, pmid] = match;
    const start = match.index;
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <a
        key={`pmid-${start}-${pmid}`}
        href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open PubMed article ${pmid}`}
        className="text-accent underline-offset-2 hover:underline"
      >
        {token}
      </a>,
    );
    last = start + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
