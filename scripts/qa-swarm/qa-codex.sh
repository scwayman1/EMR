#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# TOOL 1/3 — CODEX (OpenAI Codex CLI)  ·  Overnight Patient-Lifecycle QA
#
# Runs Codex non-interactively (`codex exec`) in a sandbox-bypassed overnight
# loop, sweeping the full patient lifecycle once per pass and rotating personas
# until the clock expires.
#
# Usage:
#   scripts/qa-swarm/qa-codex.sh
#   QA_HOURS=10 QA_SEED=1 scripts/qa-swarm/qa-codex.sh
#   QA_MODEL=gpt-5-codex scripts/qa-swarm/qa-codex.sh
#
# DANGER: launches with --dangerously-bypass-approvals-and-sandbox so it runs
# all night unattended with full access. Only run against your own local EMR.
# ─────────────────────────────────────────────────────────────────────────────
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

command -v codex >/dev/null || die "codex CLI not found. Install: npm i -g @openai/codex (or see openai.com/codex)"

qa_init_tool "codex"
qa_preflight

# Codex, fully autonomous:
#   exec "<prompt>"                              non-interactive / headless run
#   --dangerously-bypass-approvals-and-sandbox   no approvals, full access (all-night)
#   (fallback for older builds: --ask-for-approval never --sandbox danger-full-access --full-auto)
#   --cd $REPO_ROOT                              operate inside the repo
#   -m / --model                                 override with QA_MODEL
QA_MODEL="${QA_MODEL:-gpt-5-codex}"
CODEX_DANGER="--dangerously-bypass-approvals-and-sandbox"
# Older Codex builds don't recognize the combined flag — degrade gracefully.
if ! codex exec --help 2>&1 | grep -q "dangerously-bypass-approvals-and-sandbox"; then
  warn "this codex build lacks --dangerously-bypass-approvals-and-sandbox; falling back to never-ask + full-access"
  CODEX_DANGER="--ask-for-approval never --sandbox danger-full-access"
fi
CODEX_FLAGS="exec $CODEX_DANGER --cd $REPO_ROOT -m $QA_MODEL"

ok "Codex armed (model=$QA_MODEL, approvals + sandbox BYPASSED)."
warn "Running unattended for ${QA_HOURS}h. Ctrl-C to stop."

# `codex exec` takes the prompt as a trailing arg; pass the per-pass prompt via env-expanded quoting.
qa_run_loop 'codex '"$CODEX_FLAGS"' "$QA_PROMPT"'
