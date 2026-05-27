// ---------------------------------------------------------------------------
// EMR-308 — Leaf-art share card
// ---------------------------------------------------------------------------
// Generates a deterministic, AI-feel-but-deterministic-output leaf-themed
// SVG card for a given share payload. Hash → palette + leaf rotation, so
// the same URL always produces the same visual.
//
// Why deterministic instead of an actual image-model call: at share time
// the user wants the dialog to open instantly. The hook here lets a
// future server-side worker swap the SVG out for a model-generated PNG
// (Stable Diffusion / Flux / OpenAI image), cache by hash, and the
// client UX stays identical.
// ---------------------------------------------------------------------------

const PALETTES: Array<{ from: string; to: string; leaf: string }> = [
  { from: "#0f5132", to: "#84cc16", leaf: "#a7f3d0" }, // forest-lime
  { from: "#064e3b", to: "#34d399", leaf: "#d1fae5" }, // deep emerald
  { from: "#365314", to: "#bef264", leaf: "#ecfccb" }, // moss
  { from: "#1e3a8a", to: "#22d3ee", leaf: "#a5f3fc" }, // ocean-leaf
  { from: "#7c2d12", to: "#fbbf24", leaf: "#fef3c7" }, // sunset
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface LeafArtOptions {
  width?: number;
  height?: number;
  /** Stable seed (e.g. the canonical URL being shared). */
  seed: string;
  /** Optional title overlaid on the card. */
  title?: string;
}

/**
 * Build an SVG string. Inline-safe — paste it into an `<img src="data:..." />`
 * by base64-encoding, or render it inline in the share dialog preview.
 */
export function buildLeafArtSvg(options: LeafArtOptions): string {
  const { width = 1200, height = 630, seed, title } = options;
  const h = hash(seed);
  const palette = PALETTES[h % PALETTES.length];
  const rotation = (h % 360) - 180;
  const leafCount = 5 + (h % 4);

  const leaves: string[] = [];
  for (let i = 0; i < leafCount; i++) {
    const x = ((h >> (i * 3)) & 0xff) / 255;
    const y = ((h >> (i * 3 + 5)) & 0xff) / 255;
    const scale = 0.6 + (((h >> (i * 3 + 11)) & 0xff) / 255) * 0.8;
    const cx = x * width;
    const cy = y * height;
    leaves.push(
      `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${(rotation + i * 37) % 360}) scale(${scale.toFixed(2)})" opacity="${(0.3 + (i % 3) * 0.2).toFixed(2)}">` +
        `<path d="M0 -120 C 70 -90 90 -30 0 90 C -90 -30 -70 -90 0 -120 Z" fill="${palette.leaf}"/>` +
        `<path d="M0 -120 L 0 90" stroke="${palette.from}" stroke-width="2" opacity="0.4"/>` +
        `</g>`,
    );
  }

  const titleText = title
    ? `<text x="60" y="${height - 80}" font-family="ui-sans-serif, system-ui, -apple-system" font-size="48" font-weight="700" fill="white" letter-spacing="-1">${escapeXml(title.slice(0, 70))}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.from}"/>
      <stop offset="100%" stop-color="${palette.to}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  ${leaves.join("\n  ")}
  <text x="60" y="${height - 130}" font-family="ui-sans-serif, system-ui, -apple-system" font-size="22" font-weight="600" fill="white" opacity="0.85" letter-spacing="2">LEAFJOURNEY</text>
  ${titleText}
</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
