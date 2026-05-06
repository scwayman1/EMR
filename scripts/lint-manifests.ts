#!/usr/bin/env tsx
import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validateManifest } from "../src/lib/specialty-templates/manifest-schema";

const MANIFESTS_DIR = resolve(
  process.cwd(),
  "src/lib/specialty-templates/manifests",
);

async function main() {
  let entries: string[];
  try {
    entries = readdirSync(MANIFESTS_DIR);
  } catch {
    console.log(`no manifests found (directory missing: ${MANIFESTS_DIR})`);
    process.exit(0);
  }

  const files = entries
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
    .map((f) => join(MANIFESTS_DIR, f))
    .filter((p) => statSync(p).isFile());

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
