#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# QA SWARM ORCHESTRATOR — fan out all 3 ecosystems at once for the night.
#   Tool 1: Codex            (qa-codex.sh)
#   Tool 2: Claude Code      (qa-claude.sh)
#   Tool 3: Gemini/Antigrav  (qa-gemini-antigravity.sh)
#
# Boots the dev server ONCE, then launches whichever tools are installed in the
# background, each looping the full patient-lifecycle QA brief until the clock
# (QA_HOURS, default 8) runs out.
#
#   scripts/qa-swarm/qa-swarm.sh                 # all installed tools, 8h
#   QA_HOURS=10 QA_SEED=1 scripts/qa-swarm/qa-swarm.sh
#   QA_ONLY="claude,codex" scripts/qa-swarm/qa-swarm.sh
# ─────────────────────────────────────────────────────────────────────────────
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

# Boot the app once up front so the three loops don't race to start it.
QA_AUTOSTART_DEV=1 qa_init_tool "orchestrator" >/dev/null
qa_preflight

declare -A TOOLS=(
  [codex]="$QA_DIR/qa-codex.sh:codex"
  [claude]="$QA_DIR/qa-claude.sh:claude"
  [gemini]="$QA_DIR/qa-gemini-antigravity.sh:gemini"
)
ONLY="${QA_ONLY:-codex,claude,gemini}"

launched=0
for name in codex claude gemini; do
  [[ ",$ONLY," == *",$name,"* ]] || continue
  IFS=: read -r script bin <<< "${TOOLS[$name]}"
  if ! command -v "$bin" >/dev/null; then warn "skip $name — '$bin' CLI not installed"; continue; fi
  # Children skip their own boot (already healthy) and inherit the clock/flags.
  QA_AUTOSTART_DEV=0 nohup bash "$script" > "$QA_DIR/logs/swarm-$name.out" 2>&1 &
  ok "launched $name (pid $!) → logs/swarm-$name.out"
  launched=$((launched+1))
done

[ "$launched" -eq 0 ] && die "no QA tools installed — install codex / claude / gemini CLIs"
ok "$launched tool(s) sweeping the lifecycle for ${QA_HOURS}h."
log "tail findings:  ls scripts/qa-swarm/reports/*/latest/FINDINGS.md"
log "stop the swarm: pkill -f scripts/qa-swarm/qa-"
wait
