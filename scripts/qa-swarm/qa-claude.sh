#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# TOOL 2/3 — CLAUDE CODE  ·  Overnight Patient-Lifecycle QA
#
# Runs Claude Code headless in a permission-bypassed overnight loop, sweeping the
# full patient lifecycle (scheduling → kiosk → front desk → vitals → dictation →
# AVS/continuity → billing/RCM) once per pass, rotating personas until the clock
# expires. Uses the Playwright MCP browser tools to drive the real UI.
#
# Usage:
#   scripts/qa-swarm/qa-claude.sh                 # 8h default
#   QA_HOURS=10 QA_SEED=1 scripts/qa-swarm/qa-claude.sh
#   QA_FILE_TICKETS=1 scripts/qa-swarm/qa-claude.sh   # also open GitHub issues
#
# DANGER: launches with --dangerously-skip-permissions so it can run all night
# unattended. Only run against your own local EMR + demo data.
# ─────────────────────────────────────────────────────────────────────────────
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

command -v claude >/dev/null || die "claude CLI not found. Install: npm i -g @anthropic-ai/claude-code"

qa_init_tool "claude"
qa_preflight

# Claude Code, fully autonomous:
#   -p                              headless / non-interactive (prompt mode)
#   --dangerously-skip-permissions  no approval prompts — required for all-night
#   --permission-mode bypassPermissions  belt-and-suspenders for older builds
#   --add-dir / --mcp-config        Playwright + GitHub MCP already in .mcp.json
#   --model                         Opus by default; override with QA_MODEL
QA_MODEL="${QA_MODEL:-claude-opus-4-8}"
CLAUDE_FLAGS="-p --dangerously-skip-permissions --permission-mode bypassPermissions --model $QA_MODEL --add-dir $REPO_ROOT"

ok "Claude Code armed (model=$QA_MODEL, permissions BYPASSED)."
warn "Running unattended for ${QA_HOURS}h. Ctrl-C to stop."

# Each pass: feed the per-pass prompt on stdin so very long persona briefs are safe.
qa_run_loop 'printf "%s" "$QA_PROMPT" | claude '"$CLAUDE_FLAGS"
