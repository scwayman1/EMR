#!/usr/bin/env node
// Fails when a PR introduces new src/components/** or src/lib/** files
// with zero non-test importers in the same diff or in main.
//
// This is the gate from PR #236 (dead-code audit) — 22 of 22 swarm
// deliveries were unimported scaffolds. Without this rule, the next
// agent storm reproduces the same problem.
//
// Strategy:
//   1. Diff this commit/PR against the merge base.
//   2. For every NEW file under src/components/** or src/lib/**:
//      - Skip __tests__/, .test.ts, .spec.ts, .stories.tsx
//      - Skip index.ts re-exports
//      - Compute the "import basename" (filename without extension)
//      - Grep for that basename anywhere in src/ excluding the new
//        file itself and any test files
//   3. If grep finds zero hits, fail with a per-file list.
//
// Allowlist escape hatch: a new file can carry the comment
//   // SAFE: dead-export-allowed reason="<short justification>"
// on its first 5 lines and the rule passes for that file. PR review
// scrutinizes those.
//
// Usage:
//   BASE=origin/main node scripts/check-no-orphan-components.mjs
//   (BASE defaults to origin/main when running in CI; falls back to
//   HEAD~1 locally if origin/main isn't fetched.)

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function git(args) {
  return execSync(`git ${args}`, { cwd: ROOT, encoding: "utf8" });
}

function resolveBase() {
  if (process.env.BASE) return process.env.BASE;
  // CI passes GITHUB_BASE_REF
  if (process.env.GITHUB_BASE_REF) return `origin/${process.env.GITHUB_BASE_REF}`;
  try {
    git("rev-parse origin/main");
    return "origin/main";
  } catch {
    return "HEAD~1";
  }
}

const BASE = resolveBase();

const newFiles = git(`diff --name-only --diff-filter=A ${BASE}...HEAD`)
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((f) => /^src\/(components|lib)\//.test(f))
  .filter((f) => /\.(ts|tsx)$/.test(f))
  .filter((f) => !/__tests__\/|\.test\.|\.spec\.|\.stories\./.test(f))
  .filter((f) => basename(f) !== "index.ts" && basename(f) !== "index.tsx");

if (newFiles.length === 0) {
  console.log("✓ no new component / lib files in this diff");
  process.exit(0);
}

const SAFE_RE =
  /\/\/\s*SAFE:\s*dead-export-allowed\b.*?reason\s*=\s*"([^"]+)"/i;

const orphans = [];
for (const f of newFiles) {
  const path = join(ROOT, f);
  if (!existsSync(path)) continue; // file may have been deleted in a later commit

  // Allowlist comment in first 10 lines
  const first10 = readFileSync(path, "utf8").split("\n").slice(0, 10).join("\n");
  if (SAFE_RE.test(first10)) continue;

  const base = basename(f, extname(f));
  let importers = 0;
  try {
    const out = execSync(
      `grep -rl --include='*.ts' --include='*.tsx' '/${base}' src/ 2>/dev/null || true`,
      { cwd: ROOT, encoding: "utf8" },
    );
    importers = out
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((p) => p !== f) // not the file itself
      .filter((p) => !/__tests__\/|\.test\.|\.spec\./.test(p)).length;
  } catch {
    // grep returns 1 when no matches — treat as 0
    importers = 0;
  }

  if (importers === 0) orphans.push({ file: f, base });
}

if (orphans.length === 0) {
  console.log(`✓ all ${newFiles.length} new component/lib files have at least one importer`);
  process.exit(0);
}

console.error(
  `\n✗ ${orphans.length} new file(s) added with zero non-test importers:\n`,
);
for (const o of orphans) {
  console.error(`    ${o.file}`);
}
console.error(
  `\n  Each new component/lib file must be imported somewhere in the same PR,\n` +
    `  OR carry the allowlist comment in its first 10 lines:\n\n` +
    `      // SAFE: dead-export-allowed reason="<short justification>"\n\n` +
    `  Background: docs/audit/DEAD_CODE_2026-05-09.md (PR #236) found that\n` +
    `  22 of 22 swarm-delivered files were unintegrated scaffolds. This rule\n` +
    `  is the gate that prevents the next batch from doing the same.\n`,
);
process.exit(1);
