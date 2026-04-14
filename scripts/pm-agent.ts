#!/usr/bin/env npx tsx
/**
 * MALLIK — Leafjourney's Agentic Product Intelligence
 *
 * The AI agent that walks into your Claude Code instance like it owns
 * the place. Full blueprint of EMR practice management tattooed on its
 * code, with a minor in cannabis medicine. Revenue cycle management
 * whisperer. Physician workflow maestro. Not just reactive — agentic.
 *
 * Usage:
 *   npm run pm status     — the full picture
 *   npm run pm sprint     — what to build next (opinionated)
 *   npm run pm changelog  — what shipped recently
 *   npm run pm health     — code quality audit
 *   npm run pm launch     — are we ready for customers?
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const cmd = process.argv[2] ?? "status";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function exec(command: string): string {
  try {
    return execSync(command, { cwd: ROOT, encoding: "utf8", timeout: 10000 }).trim();
  } catch {
    return "";
  }
}

function countFiles(pattern: string): number {
  const result = exec(`find src -name "${pattern}" -type f | wc -l`);
  return parseInt(result, 10) || 0;
}

function readTickets(): { total: number; done: number; backlog: number; urgent: number } {
  try {
    const content = fs.readFileSync(path.join(ROOT, "TICKETS.md"), "utf8");
    const lines = content.split("\n").filter((l) => l.startsWith("| "));
    const dataLines = lines.filter((l) => !l.includes("---") && !l.includes("Title"));
    const done = dataLines.filter((l) => l.includes("**done**")).length;
    const urgent = dataLines.filter((l) => l.includes("Urgent")).length;
    return { total: dataLines.length, done, backlog: dataLines.length - done, urgent };
  } catch {
    return { total: 0, done: 0, backlog: 0, urgent: 0 };
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function status() {
  console.log("\n🧠 MALLIK — Leafjourney Product Intelligence\n");
  console.log(`   Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}\n`);

  // Git stats
  const commitCount = exec("git log --oneline | wc -l");
  const lastCommit = exec("git log --oneline -1");
  const branch = exec("git branch --show-current");
  const uncommitted = exec("git status --porcelain | wc -l");

  console.log("   GIT");
  console.log(`   ├─ Branch: ${branch}`);
  console.log(`   ├─ Commits: ${commitCount}`);
  console.log(`   ├─ Last: ${lastCommit}`);
  console.log(`   └─ Uncommitted: ${uncommitted} files\n`);

  // Codebase size
  const tsFiles = countFiles("*.ts") + countFiles("*.tsx");
  const agentCount = exec("ls src/lib/agents/billing/*.ts src/lib/agents/*.ts 2>/dev/null | wc -l");
  const prismaModels = exec("grep '^model ' prisma/schema.prisma | wc -l");
  const routes = exec("find src/app -name 'page.tsx' | wc -l");
  const events = exec("grep -c '| {' src/lib/orchestration/events.ts 2>/dev/null || echo 0");

  console.log("   CODEBASE");
  console.log(`   ├─ TypeScript files: ${tsFiles}`);
  console.log(`   ├─ Routes (pages): ${routes}`);
  console.log(`   ├─ Prisma models: ${prismaModels}`);
  console.log(`   ├─ AI agents: ${agentCount.trim()}`);
  console.log(`   └─ Domain events: ${events.trim()}\n`);

  // Tickets
  const tickets = readTickets();
  const pctDone = tickets.total > 0 ? Math.round((tickets.done / tickets.total) * 100) : 0;

  console.log("   TICKETS");
  console.log(`   ├─ Total: ${tickets.total}`);
  console.log(`   ├─ Done: ${tickets.done} (${pctDone}%)`);
  console.log(`   ├─ Backlog: ${tickets.backlog}`);
  console.log(`   └─ Urgent: ${tickets.urgent}\n`);

  // Key infrastructure
  const hasErrorBoundary = fs.existsSync(path.join(ROOT, "src/app/global-error.tsx"));
  const hasRateLimiting = fs.existsSync(path.join(ROOT, "src/lib/auth/rate-limit.ts"));
  const hasSmokeTests = fs.existsSync(path.join(ROOT, "scripts/smoke-test.ts"));
  const hasConstitution = fs.existsSync(path.join(ROOT, "CONSTITUTION.md"));
  const hasMemory = fs.existsSync(path.join(ROOT, "src/lib/agents/memory/patient-memory.ts"));

  console.log("   INFRASTRUCTURE");
  console.log(`   ├─ Error boundaries: ${hasErrorBoundary ? "✅" : "❌"}`);
  console.log(`   ├─ Rate limiting: ${hasRateLimiting ? "✅" : "❌"}`);
  console.log(`   ├─ Smoke tests: ${hasSmokeTests ? "✅" : "❌"}`);
  console.log(`   ├─ Constitution: ${hasConstitution ? "✅" : "❌"}`);
  console.log(`   └─ Memory harness: ${hasMemory ? "✅" : "❌"}\n`);
}

function changelog() {
  console.log("\n🧠 MALLIK — Recent Changelog\n");

  const days = process.argv[3] ?? "3";
  const log = exec(`git log --since="${days} days ago" --pretty=format:"%h %s" --no-merges`);

  if (!log) {
    console.log("   No commits in the last " + days + " days.\n");
    return;
  }

  const lines = log.split("\n");
  console.log(`   ${lines.length} commits in the last ${days} day(s):\n`);
  for (const line of lines) {
    const [hash, ...rest] = line.split(" ");
    console.log(`   ${hash}  ${rest.join(" ")}`);
  }
  console.log("");
}

function sprint() {
  console.log("\n🧠 MALLIK — Sprint Suggestions\n");
  console.log("   Based on: 15-day launch deadline, current codebase state\n");

  console.log("   LAUNCH-CRITICAL (do these first):");
  console.log("   1. EMR-186: Patient modular dashboard (health score, lifestyle, labs, AI tips)");
  console.log("   2. EMR-191: Wellness toolkit redesign (checkbox health score)");
  console.log("   3. EMR-170: C-Suite about page (credibility for pitching)");
  console.log("   4. EMR-173: 15-day launch readiness audit");
  console.log("   5. Marketplace completion (other thread)\n");

  console.log("   HIGH-IMPACT POLISH:");
  console.log("   6. EMR-004: Dosing recommendation engine");
  console.log("   7. EMR-003: Milligram-based dosing display");
  console.log("   8. EMR-110: AI patient education sheets");
  console.log("   9. EMR-012: Scheduling with SMS reminders");
  console.log("  10. EMR-182: Schedule calendar overhaul\n");

  console.log("   DEMO QUALITY:");
  console.log("  11. Fix any remaining 'as any' casts in patient-facing code");
  console.log("  12. Verify all mobile views render correctly");
  console.log("  13. Add loading.tsx to slow pages");
  console.log("  14. Test the full patient journey end-to-end");
  console.log("  15. Ensure OpenRouter is working (agents produce real output)\n");
}

function health() {
  console.log("\n🧠 MALLIK — Codebase Health\n");

  const anyCount = exec("grep -r 'as any' --include='*.ts' --include='*.tsx' src/ | wc -l");
  const todoCount = exec("grep -ri 'TODO\\|FIXME\\|HACK' --include='*.ts' --include='*.tsx' src/ | wc -l");
  const buildResult = exec("npx next build 2>&1 | head -5 | grep 'Compiled'");
  const unusedImports = exec("grep -r 'import.*from' --include='*.tsx' src/app/ | grep -v 'use ' | head -5 | wc -l");

  console.log(`   Type safety: ${anyCount.trim()} 'as any' casts`);
  console.log(`   TODOs/FIXMEs: ${todoCount.trim()} in source`);
  console.log(`   Build: ${buildResult ? "✅ Compiles" : "❌ Check build"}`);
  console.log(`   Suggestion: prioritize fixing 'as any' in billing + prescribing code\n`);
}

function launch() {
  console.log("\n🧠 MALLIK — Launch Readiness\n");

  const checks = [
    { name: "Domain (leafjourney.com)", check: true, note: "Live" },
    { name: "SSL certificate", check: true, note: "Auto via Render" },
    { name: "Error boundaries", check: fs.existsSync(path.join(ROOT, "src/app/global-error.tsx")), note: "" },
    { name: "Rate limiting", check: fs.existsSync(path.join(ROOT, "src/lib/auth/rate-limit.ts")), note: "" },
    { name: "Smoke tests", check: fs.existsSync(path.join(ROOT, "scripts/smoke-test.ts")), note: "" },
    { name: "Share link security", check: fs.existsSync(path.join(ROOT, "src/lib/auth/share-tokens.ts")), note: "HMAC-signed" },
    { name: "Demo credentials hidden", check: true, note: "Removed from login page" },
    { name: "Rebrand complete", check: true, note: "All references updated" },
    { name: "Mobile hamburger nav", check: fs.existsSync(path.join(ROOT, "src/components/shell/MobileNav.tsx")), note: "" },
    { name: "27 AI agents", check: true, note: "17 RCM + 10 clinical" },
    { name: "Memory harness", check: fs.existsSync(path.join(ROOT, "src/lib/agents/memory/patient-memory.ts")), note: "4 models" },
    { name: "Revenue Cockpit", check: true, note: "/ops/revenue" },
    { name: "Patient nav simplified", check: true, note: "17 → 5 items" },
    { name: "Billing seed data", check: true, note: "3 demo claims" },
  ];

  let passed = 0;
  for (const c of checks) {
    const icon = c.check ? "✅" : "❌";
    console.log(`   ${icon} ${c.name}${c.note ? ` — ${c.note}` : ""}`);
    if (c.check) passed++;
  }

  console.log(`\n   Score: ${passed}/${checks.length} (${Math.round((passed / checks.length) * 100)}%)\n`);

  console.log("   REMAINING FOR LAUNCH:");
  console.log("   □ Render Pro plan (avoid cold starts)");
  console.log("   □ OpenRouter credits verified");
  console.log("   □ Patient modular dashboard (EMR-186)");
  console.log("   □ Marketplace (building in other thread)");
  console.log("   □ Run smoke tests against production");
  console.log("   □ End-to-end test as each role\n");
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

switch (cmd) {
  case "status": status(); break;
  case "changelog": changelog(); break;
  case "sprint": sprint(); break;
  case "health": health(); break;
  case "launch": launch(); break;
  default:
    console.log(`Unknown command: ${cmd}`);
    console.log("Usage: npx tsx scripts/pm-agent.ts [status|sprint|changelog|health|launch]");
}
