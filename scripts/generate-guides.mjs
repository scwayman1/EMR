// Generates the downloadable guide PDFs under public/guides/.
//
//   • cannabis-and-cancer.pdf — EMR-202 (Justin Kander research reference)
//   • leafjourney-trifold-reference-guide.pdf — EMR-203 (cannabinoids,
//     terpenes, bioavailability, dosing pocket reference)
//
// Produces minimal but spec-valid PDF 1.4 documents (Helvetica text, one or
// more pages) with a correct cross-reference table. Run:  node scripts/generate-guides.mjs
//
// These are intentionally hand-buildable so the repo stays dependency-free;
// the rich interactive versions live at /education/trifold and the canonical
// book at freecannabiscancerbook.com.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "guides");

/** Escape text for a PDF string literal. */
function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Build a PDF from pages. Each page is { lines: [{text, size?, gap?}] }.
 * Returns a Buffer. Letter portrait, 1" margins, top-down text.
 */
function buildPdf(pages) {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length; // 1-based object number
  };

  // Reserve catalog (1) and pages (2); fill kids after page objects exist.
  const catalogNum = add(null);
  const pagesNum = add(null);
  const fontNum = add(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);

  const pageNums = [];
  for (const page of pages) {
    let y = 720;
    let stream = "BT\n";
    for (const line of page.lines) {
      const size = line.size ?? 12;
      stream += `/F1 ${size} Tf\n`;
      stream += `1 0 0 1 72 ${y} Tm\n`;
      stream += `(${esc(line.text)}) Tj\n`;
      y -= line.gap ?? size + 6;
    }
    stream += "ET";
    const contentNum = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const pageNum = add(
      `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 612 792] ` +
        `/Resources << /Font << /F1 ${fontNum} 0 R >> >> /Contents ${contentNum} 0 R >>`,
    );
    pageNums.push(pageNum);
  }

  objects[catalogNum - 1] = `<< /Type /Catalog /Pages ${pagesNum} 0 R >>`;
  objects[pagesNum - 1] =
    `<< /Type /Pages /Kids [${pageNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageNums.length} >>`;

  // Serialise with a correct xref table.
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogNum} 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

const kander = buildPdf([
  {
    lines: [
      { text: "Cannabis and Cancer", size: 26, gap: 40 },
      { text: "A Research Reference  -  compiled by Justin Kander", size: 13, gap: 30 },
      { text: "Leafjourney Education Library", size: 11, gap: 40 },
      { text: "This reference summarises a large compilation of human case", size: 12 },
      { text: "reports and peer-reviewed research on the interaction between", size: 12 },
      { text: "cannabinoids and cancer.", size: 12, gap: 28 },
      { text: "The complete, continually updated book is available free online:", size: 12 },
      { text: "https://freecannabiscancerbook.com", size: 12, gap: 28 },
      { text: "Search the underlying studies on PubMed directly from the", size: 12 },
      { text: "Research tab at https://leafjourney.com/education", size: 12, gap: 40 },
      { text: "For education only. Not medical advice. Cannabis products are", size: 10 },
      { text: "not FDA-approved medications. Always consult your care team.", size: 10 },
    ],
  },
]);

const trifold = buildPdf([
  {
    lines: [
      { text: "LeafJourney Reference Guide", size: 24, gap: 36 },
      { text: "Cannabinoids - Terpenes - Bioavailability - Dosing", size: 12, gap: 32 },
      { text: "MAJOR CANNABINOIDS", size: 14, gap: 22 },
      { text: "THC - euphoria, pain, appetite, nausea", size: 11 },
      { text: "CBD - calm, inflammation, seizures (non-intoxicating)", size: 11 },
      { text: "CBN - sedation, sleep support", size: 11 },
      { text: "CBG - focus, gut comfort, antibacterial", size: 11 },
      { text: "CBC - mood and inflammation support", size: 11, gap: 24 },
      { text: "TERPENES (aroma  ->  effect)", size: 14, gap: 22 },
      { text: "Limonene - citrus - uplifting", size: 11 },
      { text: "Pinene - pine - alert, clear-headed", size: 11 },
      { text: "Caryophyllene - pepper - calming, anti-inflammatory", size: 11 },
      { text: "Linalool - lavender - relaxing, sleep", size: 11 },
      { text: "Myrcene - earthy - sedating, body relaxation", size: 11 },
    ],
  },
  {
    lines: [
      { text: "BIOAVAILABILITY BY ROUTE", size: 16, gap: 28 },
      { text: "Inhaled (vapor/smoke) - onset 1-5 min - duration 2-4 h", size: 11 },
      { text: "Sublingual tincture - onset 15-45 min - duration 4-8 h", size: 11 },
      { text: "Edible/capsule - onset 30-120 min - duration 6-8 h", size: 11 },
      { text: "Topical - localized - no intoxication", size: 11, gap: 30 },
      { text: "HOW TO START - Start Low, Go Slow", size: 16, gap: 26 },
      { text: "1. Begin with the lowest dose.", size: 11 },
      { text: "2. Wait the full onset time before redosing.", size: 11 },
      { text: "3. A 1:1 CBD:THC ratio softens THC side effects.", size: 11 },
      { text: "4. Never drive within 4-6 hours of THC.", size: 11 },
      { text: "5. Tell your provider about every product you use.", size: 11, gap: 30 },
      { text: "Safety: cannabis can be bi-phasic - more is not always", size: 10 },
      { text: "better. For education only; not medical advice.", size: 10 },
    ],
  },
]);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "cannabis-and-cancer.pdf"), kander);
writeFileSync(join(OUT_DIR, "leafjourney-trifold-reference-guide.pdf"), trifold);
console.log(`Wrote guide PDFs to ${OUT_DIR}`);
