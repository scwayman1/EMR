#!/bin/bash
cd /Users/scottwayman/ANTIGRAVITY/EMR

echo "Dispatching Track 1: Patient Experience & Gamification..."
claude --dangerously-skip-permissions -p "Use the using-git-worktrees skill to create a worktree branch 'track-9-patient-gamification'. You are assigned to implement Track 1 of Phase 9. Please execute all Patient UX tickets: EMR-069, EMR-072, EMR-073, EMR-074, EMR-075, EMR-085, EMR-089, EMR-093, EMR-095 as defined in the TICKETS.md file. When complete, use finishing-a-development-branch to push and create a PR." > phase9_track_1.log 2>&1 &

echo "Dispatching Track 2: Clinical Workflows & Pediatrics..."
claude --dangerously-skip-permissions -p "Use the using-git-worktrees skill to create a worktree branch 'track-9-clinical-workflows'. You are assigned to implement Track 2 of Phase 9. Execute all Clinical Workflows tickets: EMR-062, EMR-070, EMR-076, EMR-077, EMR-078, EMR-079, EMR-083, EMR-090, EMR-092 from TICKETS.md. When complete, use finishing-a-development-branch to push and create a PR." > phase9_track_2.log 2>&1 &

echo "Dispatching Track 3: Integration, Research & Data..."
claude --dangerously-skip-permissions -p "Use the using-git-worktrees skill to create a worktree branch 'track-9-research-data'. You are assigned to implement Track 3 of Phase 9. Execute all Research/Data tickets: EMR-056, EMR-058, EMR-080, EMR-086, EMR-087, EMR-096, EMR-097 from TICKETS.md. When complete, use finishing-a-development-branch to push and create a PR." > phase9_track_3.log 2>&1 &

echo "Dispatching Track 4: Security, Compliance & Mental Health Walls..."
claude --dangerously-skip-permissions -p "Use the using-git-worktrees skill to create a worktree branch 'track-9-security-compliance'. You are assigned to implement Track 4 of Phase 9. Execute all Security/Admin tickets: EMR-064, EMR-065, EMR-081, EMR-082, EMR-084, EMR-088, EMR-094 from TICKETS.md. When complete, use finishing-a-development-branch to push and create a PR." > phase9_track_4.log 2>&1 &

echo "Dispatching Track 5: Commerce, Pharmacy & Billing..."
claude --dangerously-skip-permissions -p "Use the using-git-worktrees skill to create a worktree branch 'track-9-commerce-billing'. You are assigned to implement Track 5 of Phase 9. Execute all Commerce/Billing tickets: EMR-063, EMR-068, EMR-091 from TICKETS.md. When complete, use finishing-a-development-branch to push and create a PR." > phase9_track_5.log 2>&1 &

echo "All 5 Phase 9 agents have been dispatched in the background!"
echo "You can monitor their progress by running: tail -f phase9_track_1.log (or phase9_track_2.log, etc.)"
