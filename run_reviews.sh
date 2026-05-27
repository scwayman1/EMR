#!/bin/bash
echo "Starting multi-agent reviews..."
for branch in phase10/ai-clinical-intel phase10/chart-tabs phase10/imaging phase10/leafmart-v2 phase10/lifestyle-v3 phase10/marketing phase10/platform-v2 phase10/portal-ux-v2 phase10/revenue-v3 phase10/scheduling-v2; do
  echo "Dispatching Claude 4.7 agents for $branch..."
  claude ultrareview "origin/$branch" > "../review_${branch//\//_}.md" 2>&1 &
done
wait
echo "All reviews complete."
