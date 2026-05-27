// EMR-470 — Compliance export for ControllerAuditLog.
//
// Streams matching audit rows as JSONL to stdout (one row per line), so the
// output can be piped to a file, gzipped, or fed into a downstream
// compliance tool without buffering the whole result set in memory.
//
// Usage:
//   npx tsx scripts/export-audit-log.ts --practice <orgId>
//   npx tsx scripts/export-audit-log.ts --practice <orgId> --since 2026-01-01
//   npx tsx scripts/export-audit-log.ts --practice <orgId> --since 2026-01-01 --until 2026-04-01
//
// Or via npm:
//   npm run audit:export -- --practice <orgId> --since 2026-01-01
//
// Notes:
//   * `--practice` filters on `organizationId` (the column exists on every
//     row written by `logControllerAction`). The CLI flag name follows the
//     ticket spec; under the hood it maps to organizationId.
//   * `--since` / `--until` accept any ISO-8601 string Date can parse.
//   * Rows are streamed in ascending `at` order. There is no LIMIT — for
//     compliance review we want the whole window.

import { PrismaClient } from "@prisma/client";

interface CliArgs {
  practice: string;
  since?: Date;
  until?: Date;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (name: string): string | undefined => {
    const eq = argv.find((a) => a.startsWith(`--${name}=`));
    if (eq) return eq.slice(name.length + 3);
    const idx = argv.indexOf(`--${name}`);
    if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
    return undefined;
  };

  const practice = get("practice");
  if (!practice) {
    process.stderr.write(
      "error: --practice <orgId> is required\n" +
        "usage: tsx scripts/export-audit-log.ts --practice <orgId> [--since <iso>] [--until <iso>]\n",
    );
    process.exit(2);
  }

  const parseDate = (raw: string | undefined, flag: string): Date | undefined => {
    if (!raw) return undefined;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      process.stderr.write(`error: --${flag} is not a valid ISO date: ${raw}\n`);
      process.exit(2);
    }
    return d;
  };

  return {
    practice,
    since: parseDate(get("since"), "since"),
    until: parseDate(get("until"), "until"),
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    const where: Record<string, unknown> = { organizationId: args.practice };
    if (args.since || args.until) {
      const at: Record<string, Date> = {};
      if (args.since) at.gte = args.since;
      if (args.until) at.lte = args.until;
      where.at = at;
    }

    // Page in batches to avoid pulling the whole result set into memory.
    // `id` is a cuid (lexicographic time-correlated) so paginating on
    // (at, id) gives a stable ordering even when many rows share the same
    // millisecond.
    const PAGE = 500;
    let cursor: { id: string } | undefined = undefined;
    let total = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batch: Array<{
        id: string;
        at: Date;
        actorUserId: string;
        actorEmail: string | null;
        actorRoles: string[];
        organizationId: string | null;
        action: string;
        subjectType: string;
        subjectId: string;
        before: unknown;
        after: unknown;
        reason: string | null;
      }> = await prisma.controllerAuditLog.findMany({
        where,
        orderBy: [{ at: "asc" }, { id: "asc" }],
        take: PAGE,
        ...(cursor ? { skip: 1, cursor } : {}),
      });

      if (batch.length === 0) break;

      for (const row of batch) {
        process.stdout.write(JSON.stringify(row) + "\n");
        total += 1;
      }

      if (batch.length < PAGE) break;
      cursor = { id: batch[batch.length - 1].id };
    }

    process.stderr.write(`exported ${total} row(s)\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  process.stderr.write(
    `export-audit-log failed: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
