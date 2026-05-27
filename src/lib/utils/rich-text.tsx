import * as React from "react";
import { linkifyPmid } from "./linkify-pmid";

const BOLD_PATTERN = /\*\*([^*\n][^*\n]*?)\*\*/g;

/**
 * Render plain text with two transforms applied:
 *
 *   - `**word**` becomes `<strong>word</strong>` (so AI-streamed copy
 *     doesn't surface raw markdown asterisks to patients).
 *   - "(PMID: 12345678)" / "PMID 12345678" becomes a PubMed link.
 *
 * Used by education surfaces that render model output character-by-
 * character. Per EMR-368: never show literal `**` to a patient.
 */
export function RichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return <span className={className}>{renderRich(text)}</span>;
}

export function renderRich(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  BOLD_PATTERN.lastIndex = 0;
  while ((match = BOLD_PATTERN.exec(text)) !== null) {
    const start = match.index;
    if (start > last) {
      for (const node of linkifyPmid(text.slice(last, start))) out.push(node);
    }
    out.push(
      <strong key={`b-${start}`} className="font-semibold">
        {linkifyPmid(match[1])}
      </strong>,
    );
    last = start + match[0].length;
  }
  if (last < text.length) {
    for (const node of linkifyPmid(text.slice(last))) out.push(node);
  }
  return out;
}
