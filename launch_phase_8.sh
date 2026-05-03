#!/bin/bash
cd /Users/scottwayman/ANTIGRAVITY/EMR

echo "Dispatching Track 1: UX Polish..."
claude --dangerously-skip-permissions -p "Use the using-git-worktrees skill to create a worktree branch 'track-8-ux-polish'. You are assigned to implement Track 1 of Phase 8. Please execute all UX Polish tickets: EMR-015, EMR-028, EMR-031, EMR-176, EMR-177, EMR-185, EMR-189 as defined in the TICKETS.md summary table. IMPORTANT: Do NOT touch the main clinician shell navigation, as Track 7 is modifying it. When complete, use finishing-a-development-branch to push and create a PR." > track_1.log 2>&1 &

echo "Dispatching Track 2: Patient Portal Redesign & Gamification..."
claude --dangerously-skip-permissions -p "Use the using-git-worktrees skill to create a worktree branch 'track-8-portal-gamification'. You are assigned to implement Track 2 of Phase 8. Execute all Portal tickets: EMR-130, EMR-133, EMR-134, EMR-137, EMR-138, EMR-139, EMR-144, EMR-149, EMR-161, EMR-162, EMR-163, EMR-186, EMR-191 from the TICKETS.md summary table. When complete, use finishing-a-development-branch to push and create a PR." > track_2.log 2>&1 &

echo "Dispatching Track 3: Cannabis Commerce & Dispensaries..."
claude --dangerously-skip-permissions -p "Use the using-git-worktrees skill to create a worktree branch 'track-8-pharmacology'. You are assigned to implement Track 3 of Phase 8. Execute all Pharmacology and Commerce tickets: EMR-002, EMR-007, EMR-017, EMR-018, EMR-039, EMR-145, EMR-150, EMR-151, EMR-181, EMR-188 from the TICKETS.md summary table. When complete, use finishing-a-development-branch to push and create a PR." > track_3.log 2>&1 &

echo "Dispatching Track 4: Admin & Analytics Dashboard..."
claude --dangerously-skip-permissions -p "Use the using-git-worktrees skill to create a worktree branch 'track-8-admin-analytics'. You are assigned to implement Track 4 of Phase 8. Execute all Admin/Analytics tickets: EMR-155, EMR-170, EMR-172, EMR-178, EMR-179, EMR-183 from the TICKETS.md summary table. When complete, use finishing-a-development-branch to push and create a PR." > track_4.log 2>&1 &

echo "Dispatching Track 5: Clinical Communications & Telehealth..."
claude --dangerously-skip-permissions -p "Use the using-git-worktrees skill to create a worktree branch 'track-8-communications'. You are assigned to implement Track 5 of Phase 8. Execute all Communications tickets: EMR-033, EMR-034, EMR-037, EMR-143, EMR-146 from the TICKETS.md summary table. When complete, use finishing-a-development-branch to push and create a PR." > track_5.log 2>&1 &

echo "Dispatching Track 6: DICOM Imaging & Medical Records..."
claude --dangerously-skip-permissions -p "Use the using-git-worktrees skill to create a worktree branch 'track-8-dicom'. You are assigned to implement Track 6 of Phase 8. Execute all Imaging tickets: EMR-014, EMR-140, EMR-141, EMR-164, EMR-166 from the TICKETS.md summary table. IMPORTANT: Build these as isolated components and do NOT attempt to wire them directly into the Clinician Shell, to avoid merge conflicts with Track 7. When complete, use finishing-a-development-branch to push and create a PR." > track_6.log 2>&1 &

echo "Dispatching Track 7: Clinician App & AI Workflows..."
claude --dangerously-skip-permissions -p "Use the using-git-worktrees skill to create a worktree branch 'track-8-clinician-workflows'. You are assigned to implement Track 7 of Phase 8. Execute all Clinician AI tickets: EMR-077, EMR-078, EMR-079, EMR-129, EMR-131, EMR-132, EMR-135, EMR-136, EMR-148, EMR-157, EMR-158, EMR-159, EMR-160, EMR-165, EMR-180, EMR-182 from the TICKETS.md summary table. When complete, use finishing-a-development-branch to push and create a PR." > track_7.log 2>&1 &

echo "Dispatching Track 8: Platform Licensing & MIPS..."
claude --dangerously-skip-permissions -p "Use the using-git-worktrees skill to create a worktree branch 'track-8-platform-licensing'. You are assigned to implement Track 8 of Phase 8. Execute all Platform tickets: EMR-013, EMR-042, EMR-044, EMR-045, EMR-147, EMR-153, EMR-154, EMR-156, EMR-173 from the TICKETS.md summary table. When complete, use finishing-a-development-branch to push and create a PR." > track_8.log 2>&1 &

echo "All 8 Phase 8 agents have been dispatched in the background!"
echo "You can monitor their progress by running: tail -f track_1.log (or track_2.log, etc.)"
