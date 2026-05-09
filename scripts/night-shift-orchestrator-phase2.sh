#!/bin/bash

# Night Shift Orchestrator Phase 2
# This script runs through the Phase 2 swarm branches (31 to 60) sequentially.
# It uses the Claude CLI to automatically execute the agent prompt in each branch.

echo "🌙 Starting Epic 30-Agent Night Shift Sequence (Phase 2)..."

git checkout main
git pull origin main

for i in {31..60}; do
    # Format the branch number
    NUM=$i
    
    # Find the matching branch
    BRANCH=$(git branch -a | grep "feat/swarm-$NUM" | awk '{print $1}' | sed 's/remotes\/origin\///' | head -n 1)
    
    # Clean up whitespace
    BRANCH=$(echo "$BRANCH" | xargs)
    
    if [ -z "$BRANCH" ]; then
        echo "⚠️ Could not find branch for $NUM. Skipping."
        continue
    fi
    
    echo "=========================================================="
    echo "🚀 DISPATCHING AGENT $NUM on branch $BRANCH"
    echo "=========================================================="
    
    # Switch to the branch
    git checkout $BRANCH
    
    if [ ! -f ".agent-prompt.md" ]; then
        echo "⚠️ No .agent-prompt.md found in $BRANCH. Skipping."
        continue
    fi
    
    PROMPT=$(cat .agent-prompt.md)
    
    echo "Executing Claude..."
    # We pass an explicit instruction to do the work and exit.
    claude -p "$PROMPT. When finished, run typecheck, lint, commit, and push. Then say 'TASK_COMPLETE' and exit."
    
    echo "✅ Agent $NUM completed."
    sleep 5
done

git checkout main
echo "☀️ Good morning! The Phase 2 Night Shift has completed 30 tasks."
