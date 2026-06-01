#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# TOOL 3/3 — GEMINI (Flash) in ANTIGRAVITY  ·  Overnight Patient-Lifecycle QA
#
# Drives Gemini in fully-autonomous "YOLO" mode through the Gemini CLI (the same
# agent engine Antigravity uses), sweeping the full patient lifecycle once per
# pass and rotating personas until the clock expires.
#
# Antigravity (the IDE) consumes the SAME brief: this script also writes an
# import-ready task file at scripts/qa-swarm/.runtime/antigravity-task.md that you
# can paste into Antigravity's Agent Manager and run in parallel with the CLI.
#
# Usage:
#   scripts/qa-swarm/qa-gemini-antigravity.sh
#   QA_HOURS=10 QA_SEED=1 scripts/qa-swarm/qa-gemini-antigravity.sh
#   QA_MODEL=gemini-2.5-flash scripts/qa-swarm/qa-gemini-antigravity.sh
#
# DANGER: launches with --yolo (auto-approve every tool call) so it runs all
# night unattended. Only run against your own local EMR + demo data.
# ─────────────────────────────────────────────────────────────────────────────
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

command -v gemini >/dev/null || die "gemini CLI not found. Install: npm i -g @google/gemini-cli (the engine behind Antigravity)"

qa_init_tool "gemini"
qa_preflight

# The user asked for "Gemini 3.5 Flash" — there is no public model by that exact
# id yet; default to the latest Flash alias and let QA_MODEL override.
QA_MODEL="${QA_MODEL:-gemini-flash-latest}"

# Gemini CLI, fully autonomous:
#   -p / --prompt        non-interactive headless run
#   -y / --yolo          auto-approve ALL tool calls (required for all-night)
#   -m / --model         Flash model
#   -a / --all-files     give it repo context
GEMINI_FLAGS="--yolo -m $QA_MODEL"

# Drop an Antigravity-importable task file so the IDE agent can run the same brief.
mkdir -p "$QA_DIR/.runtime"
ANTIGRAV_TASK="$QA_DIR/.runtime/antigravity-task.md"
cat > "$ANTIGRAV_TASK" <<EOF
# Antigravity Agent Task — Overnight Patient-Lifecycle QA (Gemini Flash)

Run in YOLO / auto-execute mode. Loop until stopped.

Brief: $QA_BRIEF
App: $BASE_URL  ·  Logins (pw Longbeach2026!): patient@/clinician@/owner@demo.health
Write findings to: $QA_FINDINGS   ·   Screenshots to: $QA_SHOTS

Sweep all 7 lifecycle stages per pass, rotate personas (happy → adversarial →
multi-tenant/RBAC → no-show → returning+billing), be BRUTALLY honest, and keep
the SUMMARY block at the top of the findings file current. A 200 response is not
a pass — observe the real end state. Be merciless on the kiosk.
EOF
ok "Antigravity task written → $ANTIGRAV_TASK (paste into the Agent Manager to fan out)"

ok "Gemini armed (model=$QA_MODEL, YOLO auto-approve ON)."
warn "Running unattended for ${QA_HOURS}h. Ctrl-C to stop."

# Feed the per-pass prompt on stdin (-p with stdin keeps very long persona briefs safe).
qa_run_loop 'printf "%s" "$QA_PROMPT" | gemini -p '"$GEMINI_FLAGS"
