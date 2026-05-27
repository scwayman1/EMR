#!/usr/bin/env tsx
/**
 * Modality Bleed Lint — EMR-410
 *
 * Fails the build when a hardcoded "cannabis" string OR an
 * `if (specialty === 'cannabis')` pattern leaks into `*.ts` / `*.tsx` files
 * outside the cannabis module / manifest / modality-registry whitelist.
 *
 * Whitelist (see ticket EMR-410):
 *   - src/modules/cannabis/**                       — canonical cannabis home
 *   - src/lib/specialty-templates/manifests/**      — manifests legitimately name modalities
 *   - src/lib/modality/**                           — modality registry itself names slugs
 *   - any *.test.ts / *.test.tsx file               — tests are allowed to assert names
 *   - line-comments and block-comments              — comments may explain bleed
 *   - the manifest-schema enum literal              — REGISTERED_MODALITIES contains "cannabis-medicine"
 *
 * The lint is intentionally a string scanner, not an AST walk: it should
 * catch *the spelling* `cannabis` and the *exact branch* shape regardless of
 * surrounding TypeScript syntax. Authors who legitimately need to mention
 * cannabis can move the code to a whitelisted path or keep it in a comment.
 *
 * Output: one line per offending hit (path:line:col — message). Exit 1 when
 * any hits are found, 0 otherwise.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const ROOT = resolve(process.cwd());
const SRC = join(ROOT, "src");

const WHITELIST_PREFIXES = [
  // POSIX-style; we normalize on lookup.
  "src/modules/cannabis/",
  "src/lib/specialty-templates/manifests/",
  "src/lib/modality/",
].map((p) => p.split("/").join(sep));

const WHITELIST_FILES = [
  // The enum literal is the registry-of-record for modality slugs and is
  // expected to contain the string "cannabis".
  ["src", "lib", "specialty-templates", "manifest-schema.ts"].join(sep),
].map((p) => p);

type Hit = {
  file: string;
  line: number;
  col: number;
  message: string;
  text: string;
};

function isTestFile(rel: string): boolean {
  return (
    rel.endsWith(".test.ts") ||
    rel.endsWith(".test.tsx") ||
    rel.includes(`${sep}__tests__${sep}`)
  );
}

function isWhitelisted(rel: string): boolean {
  if (WHITELIST_FILES.includes(rel)) return true;
  for (const prefix of WHITELIST_PREFIXES) {
    if (rel.startsWith(prefix)) return true;
  }
  return false;
}

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) {
      continue;
    }
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, out);
    } else if (st.isFile() && (name.endsWith(".ts") || name.endsWith(".tsx"))) {
      out.push(full);
    }
  }
}

/**
 * Strip line and block comments from `src` while preserving line numbers, so
 * column offsets reported in the source still line up. Strings are *not*
 * stripped — a literal "cannabis" inside a string IS a hit (that's the
 * whole point of the lint).
 */
function stripComments(src: string): string {
  const out: string[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];

    // Line comment: replace from // to newline with spaces, keep newline.
    if (c === "/" && c2 === "/") {
      while (i < n && src[i] !== "\n") {
        out.push(" ");
        i++;
      }
      continue;
    }

    // Block comment: replace until */ with spaces, preserving any newlines.
    if (c === "/" && c2 === "*") {
      out.push("  ");
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        out.push(src[i] === "\n" ? "\n" : " ");
        i++;
      }
      if (i < n) {
        out.push("  ");
        i += 2;
      }
      continue;
    }

    out.push(c);
    i++;
  }
  return out.join("");
}

/** Yields {line, col} for a 0-based char index in `src`. */
function locationOf(src: string, index: number): { line: number; col: number } {
  let line = 1;
  let col = 1;
  for (let i = 0; i < index; i++) {
    if (src[i] === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}

const CANNABIS_PATTERN = /cannabis/gi;
const SPECIALTY_BRANCH_PATTERN =
  /if\s*\(\s*specialty\s*===\s*['"]cannabis['"]\s*\)/g;

function scanFile(filePath: string, rel: string): Hit[] {
  const raw = readFileSync(filePath, "utf8");
  const stripped = stripComments(raw);
  const hits: Hit[] = [];

  // 1. Hardcoded "cannabis" literal in non-comment source.
  for (const m of stripped.matchAll(CANNABIS_PATTERN)) {
    if (m.index === undefined) continue;
    const { line, col } = locationOf(stripped, m.index);
    hits.push({
      file: rel,
      line,
      col,
      message: 'hardcoded "cannabis" outside whitelist',
      text: raw
        .split("\n")
        [line - 1]?.trim()
        .slice(0, 160) ?? "",
    });
  }

  // 2. `if (specialty === 'cannabis')` branch shape.
  for (const m of stripped.matchAll(SPECIALTY_BRANCH_PATTERN)) {
    if (m.index === undefined) continue;
    const { line, col } = locationOf(stripped, m.index);
    hits.push({
      file: rel,
      line,
      col,
      message: "branch on `specialty === 'cannabis'` — use modality gate instead",
      text: raw
        .split("\n")
        [line - 1]?.trim()
        .slice(0, 160) ?? "",
    });
  }

  return hits;
}

function main(): void {
  const all: string[] = [];
  walk(SRC, all);

  const hits: Hit[] = [];
  for (const file of all) {
    const rel = relative(ROOT, file);
    if (isTestFile(rel)) continue;
    if (isWhitelisted(rel)) continue;
    hits.push(...scanFile(file, rel));
  }

  if (hits.length === 0) {
    console.log("modality-bleed: clean (0 hits)");
    process.exit(0);
  }

  for (const h of hits) {
    console.log(`${h.file}:${h.line}:${h.col} — ${h.message}`);
    if (h.text) console.log(`    ${h.text}`);
  }
  console.log(`\nmodality-bleed: ${hits.length} hit(s)`);
  process.exit(1);
}

main();
