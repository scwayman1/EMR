#!/usr/bin/env tsx
/**
 * Manifest CI lint — EMR-429 / EMR-433.
 *
 * Walks every manifest file under `src/lib/specialty-templates/manifests/`
 * (both flat `*.ts` and nested `{slug}/v*.ts` layouts) and runs
 * `validateManifest` against each exported object.
 *
 * Modality cross-check: the Zod schema's `superRefine` already rejects any
 * modality that is not in `REGISTERED_MODALITIES` (see
 * `src/lib/specialty-templates/manifest-schema.ts`). We deliberately do NOT
 * duplicate that check here — the Zod error surfaces with the field path and
 * the offending modality string, which is the actionable signal CI needs.
 * If the schema check is ever removed or weakened, this script will start
 * passing manifests that should be rejected; that's the inverse risk we
 * accept in exchange for a single source of truth.
 */
import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validateManifest } from "../src/lib/specialty-templates/manifest-schema";

const MANIFESTS_DIR = resolve(
  process.cwd(),
  "src/lib/specialty-templates/manifests",
);

function collectManifestFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isFile()) {
      if (
        entry.endsWith(".ts") &&
        !entry.endsWith(".d.ts") &&
        !entry.endsWith(".test.ts")
      ) {
        out.push(full);
      }
    } else if (stat.isDirectory()) {
      // EMR-431 nested versioned layout: manifests/{slug}/v{X.Y.Z}.ts.
      out.push(...collectManifestFiles(full));
    }
  }
  return out;
}

async function main() {
  let entries: string[];
  try {
    entries = readdirSync(MANIFESTS_DIR);
  } catch {
    console.log(`no manifests found (directory missing: ${MANIFESTS_DIR})`);
    process.exit(0);
  }
  // Reference `entries` so the early-exit branch above stays meaningful.
  void entries;

  const files = collectManifestFiles(MANIFESTS_DIR);

  if (files.length === 0) {
    console.log("no manifests found");
    process.exit(0);
  }

  let failures = 0;

  for (const file of files) {
    const url = pathToFileURL(file).href;
    let mod: Record<string, unknown>;
    try {
      mod = (await import(url)) as Record<string, unknown>;
    } catch (err) {
      console.error(`✗ ${file}\n    import failed: ${(err as Error).message}`);
      failures++;
      continue;
    }

    const candidates = Object.entries(mod).filter(
      ([key, value]) =>
        key !== "__esModule" && value && typeof value === "object",
    );

    if (candidates.length === 0) {
      console.error(`✗ ${file}\n    no exported manifest object found`);
      failures++;
      continue;
    }

    let fileFailures = 0;
    for (const [exportName, value] of candidates) {
      const result = validateManifest(value);
      if (result.ok) {
        console.log(`✓ ${file} [${exportName}] — ${result.manifest.slug}@${result.manifest.version}`);
      } else {
        fileFailures++;
        console.error(`✗ ${file} [${exportName}]`);
        for (const e of result.errors) {
          console.error(`    ${e}`);
        }
      }
    }
    if (fileFailures > 0) failures++;
  }

  if (failures > 0) {
    console.error(`\n${failures} manifest file(s) failed validation`);
    process.exit(1);
  }
  console.log(`\nall ${files.length} manifest file(s) passed`);
}

main().catch((err) => {
  console.error("lint-manifests crashed:", err);
  process.exit(1);
});
