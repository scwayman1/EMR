#!/usr/bin/env bash
# Shared bootstrap for the overnight Patient-Lifecycle QA swarm.
# Sourced by qa-codex.sh, qa-claude.sh, qa-gemini-antigravity.sh.
# Pure bash, no tool-specific logic lives here.

set -uo pipefail

# --- Paths ------------------------------------------------------------------
QA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$QA_DIR/../.." && pwd)"
export QA_DIR REPO_ROOT
export QA_BRIEF="$QA_DIR/PATIENT-LIFECYCLE-QA-BRIEF.md"

# --- Tunables (override via env) -------------------------------------------
export BASE_URL="${BASE_URL:-http://localhost:3000}"
export QA_HOURS="${QA_HOURS:-8}"            # how long to run, in hours
export QA_PASS_BUDGET_MIN="${QA_PASS_BUDGET_MIN:-45}"  # soft cap per pass
export QA_FILE_TICKETS="${QA_FILE_TICKETS:-0}"         # 1 = open GitHub issues for P0/P1
export QA_SEED="${QA_SEED:-0}"              # 1 = run db:seed during preflight
export QA_AUTOSTART_DEV="${QA_AUTOSTART_DEV:-1}"       # 1 = boot `npm run dev` if down

# --- Colors -----------------------------------------------------------------
if [ -t 1 ]; then
  C_R="\033[31m"; C_G="\033[32m"; C_Y="\033[33m"; C_B="\033[34m"; C_DIM="\033[2m"; C_0="\033[0m"
else
  C_R=""; C_G=""; C_Y=""; C_B=""; C_DIM=""; C_0=""
fi
log()  { printf "${C_B}[qa-swarm]${C_0} %s\n" "$*"; }
ok()   { printf "${C_G}[qa-swarm]${C_0} %s\n" "$*"; }
warn() { printf "${C_Y}[qa-swarm]${C_0} %s\n" "$*"; }
die()  { printf "${C_R}[qa-swarm] FATAL:${C_0} %s\n" "$*" >&2; exit 1; }

# --- Per-tool runtime layout ------------------------------------------------
# Call: qa_init_tool <tool-name>
qa_init_tool() {
  local tool="$1"
  export QA_TOOL="$tool"
  local stamp; stamp="$(date +%Y%m%d-%H%M%S)"
  export QA_RUN_DIR="$QA_DIR/reports/$tool/$stamp"
  export QA_SHOTS="$QA_RUN_DIR/screenshots"
  export QA_FINDINGS="$QA_RUN_DIR/FINDINGS.md"
  export QA_LOG="$QA_DIR/logs/$tool-$stamp.log"
  mkdir -p "$QA_SHOTS" "$QA_DIR/logs"
  # "latest" convenience symlink
  ln -sfn "$QA_RUN_DIR" "$QA_DIR/reports/$tool/latest" 2>/dev/null || true

  if [ ! -f "$QA_FINDINGS" ]; then
    cat > "$QA_FINDINGS" <<EOF
# QA Swarm Findings — $tool

> Run started $(date). App under test: $BASE_URL
> Brief: PATIENT-LIFECYCLE-QA-BRIEF.md. Severity-sorted; SUMMARY block lives at top.

## SUMMARY (latest pass)
_(no pass completed yet)_

---

## Findings log
EOF
  fi
  ok "tool=$tool  run_dir=$QA_RUN_DIR"
}

# --- Dev server health + boot ----------------------------------------------
qa_health() { curl -fsS --max-time 5 "$BASE_URL/api/health" >/dev/null 2>&1; }

qa_ensure_app() {
  if qa_health; then ok "app healthy at $BASE_URL"; return 0; fi
  if [ "$QA_AUTOSTART_DEV" != "1" ]; then
    die "app not reachable at $BASE_URL/api/health and QA_AUTOSTART_DEV=0"
  fi
  warn "app not up — booting 'npm run dev' (logs -> $QA_DIR/logs/dev-server.log)"
  ( cd "$REPO_ROOT" && nohup npm run dev > "$QA_DIR/logs/dev-server.log" 2>&1 & echo $! > "$QA_DIR/.runtime/dev.pid" )
  mkdir -p "$QA_DIR/.runtime"
  local n=0
  until qa_health; do
    n=$((n+1)); [ "$n" -gt 60 ] && die "dev server did not become healthy in ~120s (see logs/dev-server.log)"
    sleep 2
  done
  ok "dev server is up"
}

qa_preflight() {
  command -v node >/dev/null || die "node not found"
  command -v npm  >/dev/null || die "npm not found"
  [ -f "$REPO_ROOT/package.json" ] || die "run from inside the EMR repo"
  if [ "$QA_SEED" = "1" ]; then
    log "seeding demo data (npm run db:seed)…"
    ( cd "$REPO_ROOT" && npm run db:seed ) >> "$QA_DIR/logs/seed.log" 2>&1 || warn "db:seed failed — continuing (see logs/seed.log)"
  fi
  qa_ensure_app
}

# --- The overnight clock ----------------------------------------------------
# qa_run_loop "<command template>"  — runs the template once per pass until the
# clock expires. The template is eval'd; it should invoke the tool with the
# prompt built by qa_build_prompt for the current pass (exposed as $QA_PROMPT).
QA_PERSONAS=(
  "HAPPY PATH: well-behaved new patient, valid insurance, correct DOB. Prove every stage end-to-end."
  "ADVERSARIAL: wrong DOB at kiosk, declines consent first then accepts, malformed intake answers, double-submits forms, hits browser-back mid-flow."
  "MULTI-TENANT / RBAC: log in as patient and try to reach /clinic and /ops; check whether org A can see org B data. Any leak is P0."
  "NO-SHOW / CANCEL: book, then cancel and reschedule; arrive late; expired kiosk handoff token; idle lobby session."
  "RETURNING PATIENT + BILLING DEPTH: existing patient with prior notes; focus Stages 6-7, reconcile money math and AVS-vs-portal continuity."
)

qa_build_prompt() {
  local pass="$1" persona_idx=$(( ($1 - 1) % ${#QA_PERSONAS[@]} ))
  local persona="${QA_PERSONAS[$persona_idx]}"
  export QA_PROMPT="You are a hostile, BRUTALLY HONEST QA engineer running pass #$pass of an overnight test of the Leafjourney EMR patient lifecycle.

Read and obey the full brief at: $QA_BRIEF
App under test: $BASE_URL   (already confirmed healthy)
Demo logins (password Longbeach2026!): patient@demo.health / clinician@demo.health / owner@demo.health

THIS PASS — persona: $persona

Drive the patient through ALL 7 lifecycle stages in order (Scheduling -> Kiosk check-in -> Front desk -> Vitals/rooming -> Physician dictation/visit -> Printed+digital advice/continuity -> Billing/RCM) using the Playwright browser tools. Screenshot every state transition into: $QA_SHOTS
Append every defect (route, steps, actual, expected, severity P0-P3, screenshot path) to the living findings file: $QA_FINDINGS
After completing the sweep, OVERWRITE the '## SUMMARY (latest pass)' block at the top of that file with: counts by severity, PASS/FAIL/BLOCKED per stage, and the single worst defect.
$( [ "$QA_FILE_TICKETS" = "1" ] && echo "For each NEW P0/P1, open a GitHub issue in scwayman1/emr labeled qa-swarm titled [QA][P{n}][Stage{m}] ... (de-dupe against existing open qa-swarm issues)." )
Rules: do NOT mass-refactor. Small surgical fixes for unambiguous P0/P1 only, each with a test that proves it. A page returning 200 is NOT a pass — you must observe the real end state. Be merciless on the kiosk. Soft time budget for this pass: ${QA_PASS_BUDGET_MIN} minutes, then write your summary and exit so the next pass can start."
}

qa_run_loop() {
  local cmd_template="$1"
  local deadline=$(( $(date +%s) + QA_HOURS*3600 ))
  local pass=0
  log "overnight loop armed: ${QA_HOURS}h, persona rotation x${#QA_PERSONAS[@]}, tool=$QA_TOOL"
  log "findings: $QA_FINDINGS"
  while [ "$(date +%s)" -lt "$deadline" ]; do
    pass=$((pass+1))
    qa_build_prompt "$pass"
    local remain=$(( (deadline - $(date +%s)) / 60 ))
    log "── PASS #$pass ── (${remain} min left on the clock) ──"
    # Re-assert the app is alive before each pass; passes are long.
    qa_health || { warn "app went unhealthy — attempting reboot"; qa_ensure_app; }
    eval "$cmd_template" 2>&1 | tee -a "$QA_LOG"
    ok "pass #$pass complete"
  done
  ok "clock expired after $pass passes. Final findings: $QA_FINDINGS"
  echo "$QA_FINDINGS"
}
