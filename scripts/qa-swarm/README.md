# 🌙 Overnight Patient-Lifecycle QA Swarm

Three autonomous agents, three ecosystems, one job: **prove — or disprove — that a
patient can make it through the entire Leafjourney EMR lifecycle**, brutally and
honestly, all night long.

```
scheduling → kiosk check-in → front desk → vitals/rooming →
physician dictation/visit → printed + digital advice (continuity of care) → billing/RCM
```

## The three scripts (one per tool)

| Tool | Script | Autonomy flag |
|------|--------|---------------|
| **Codex** (OpenAI Codex CLI) | `qa-codex.sh` | `--dangerously-bypass-approvals-and-sandbox` |
| **Claude Code** | `qa-claude.sh` | `--dangerously-skip-permissions` |
| **Gemini Flash** (in Antigravity) | `qa-gemini-antigravity.sh` | `--yolo` (auto-approve all) |

All three read the same hostile-QA mission: **`PATIENT-LIFECYCLE-QA-BRIEF.md`**.
They drive the real UI with the Playwright MCP browser tools, screenshot every
state transition, and append severity-ranked findings to a living report.

## Run it

```bash
# one tool
QA_HOURS=8 scripts/qa-swarm/qa-claude.sh

# all installed tools at once, seed fresh demo data, 10 hours, file GitHub issues
QA_HOURS=10 QA_SEED=1 QA_FILE_TICKETS=1 scripts/qa-swarm/qa-swarm.sh
```

The launcher boots `npm run dev` if it isn't already up and waits for
`/api/health` before handing off. Demo logins (password `Longbeach2026!`):
`patient@demo.health`, `clinician@demo.health`, `owner@demo.health`.

## Knobs (env vars)

| Var | Default | Meaning |
|-----|---------|---------|
| `QA_HOURS` | `8` | how long the overnight loop runs |
| `QA_PASS_BUDGET_MIN` | `45` | soft time cap per lifecycle sweep |
| `QA_SEED` | `0` | `1` = run `npm run db:seed` during preflight |
| `QA_AUTOSTART_DEV` | `1` | `1` = boot the dev server if it's down |
| `QA_FILE_TICKETS` | `0` | `1` = open a GitHub issue per P0/P1 (`scwayman1/emr`, label `qa-swarm`) |
| `QA_MODEL` | per-tool | override the model (`gpt-5-codex`, `claude-opus-4-8`, `gemini-flash-latest`) |
| `BASE_URL` | `http://localhost:3000` | app under test |
| `QA_ONLY` | all | (orchestrator) comma list, e.g. `claude,codex` |

## Output

```
scripts/qa-swarm/reports/<tool>/<timestamp>/FINDINGS.md   # living, severity-sorted; SUMMARY at top
scripts/qa-swarm/reports/<tool>/<timestamp>/screenshots/  # stageN-*.png
scripts/qa-swarm/reports/<tool>/latest -> newest run
scripts/qa-swarm/logs/                                    # per-tool + dev-server logs
```

Reports/logs are git-ignored — the **scripts** are committed, the nightly output is not.

## Each pass rotates a persona

happy path → adversarial (wrong DOB, declined consent, double-submit, back-button)
→ multi-tenant/RBAC leak hunt → no-show/cancel/expired-token → returning patient +
billing-math reconciliation. If everything passes, the agents get *meaner*, not
quieter — that's the point.

## ⚠️ Safety

These scripts deliberately disable approval prompts so the agents can work
unattended overnight. **Only run them against your own local EMR instance with
demo data.** They can edit files, run commands, and (with `QA_FILE_TICKETS=1`)
open GitHub issues. The brief forbids mass refactors — agents may only make small,
surgical, test-backed fixes for unambiguous P0/P1 defects; everything else is filed,
not changed.

## Antigravity (IDE) parallel lane

`qa-gemini-antigravity.sh` also writes `.runtime/antigravity-task.md` — paste it
into Antigravity's Agent Manager to run the identical brief inside the IDE in
parallel with the CLI loop.
