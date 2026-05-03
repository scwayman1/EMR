#!/bin/bash
# Phase 8 V2 Re-launch — only the 6 stalled tracks
# Tracks 1 (UX Polish) and 6 (DICOM) already completed and pushed.

cd /Users/scottwayman/ANTIGRAVITY/EMR

echo "Re-dispatching Track 2: Patient Portal Gamification..."
claude --dangerously-skip-permissions -p "You are working in an existing git worktree at /Users/scottwayman/ANTIGRAVITY/EMR-wt/track-8-portal-gamification on branch track-8-portal-gamification. cd into that directory. You are assigned to implement Track 2 of Phase 8. Execute all Portal tickets: EMR-130, EMR-133, EMR-134, EMR-137, EMR-138, EMR-139, EMR-144, EMR-149, EMR-161, EMR-162, EMR-163, EMR-186, EMR-191. These tickets exist as titles in the TICKETS.md summary table — infer requirements from their titles and implement them. Focus on patient engagement features: My Garden guide, medication explainer, emotional vitals, fitness module, mindfulness, food OCR, emergency QR wallet, etc. When complete, commit all work, push the branch, and create a PR to main." > track_2.log 2>&1 &

echo "Re-dispatching Track 3: Cannabis Commerce & Dispensaries..."
claude --dangerously-skip-permissions -p "You are working in an existing git worktree at /Users/scottwayman/ANTIGRAVITY/EMR-wt/track-8-pharmacology on branch scwayman/track-8-pharmacology. cd into that directory. You are assigned to implement Track 3 of Phase 8. Execute all Pharmacology and Commerce tickets: EMR-002, EMR-007, EMR-017, EMR-018, EMR-039, EMR-145, EMR-150, EMR-151, EMR-181, EMR-188. These tickets exist as titles in the TICKETS.md summary table — infer requirements from their titles and implement them. Focus on dispensary integration, Google Maps locator, Leafly strain integration, Combo Wheel, symptom supplement wheel, and marketplace features. When complete, commit all work, push the branch, and create a PR to main." > track_3.log 2>&1 &

echo "Re-dispatching Track 4: Admin & Analytics Dashboard..."
claude --dangerously-skip-permissions -p "You are working in an existing git worktree at /Users/scottwayman/ANTIGRAVITY/EMR-wt/track-8-admin-analytics on branch scwayman/track-8-admin-analytics. cd into that directory. You are assigned to implement Track 4 of Phase 8. Execute all Admin/Analytics tickets: EMR-155, EMR-170, EMR-172, EMR-178, EMR-179, EMR-183. These tickets exist as titles in the TICKETS.md summary table — infer requirements from their titles and implement them. Focus on admin dashboards, analytics reporting, and platform monitoring. When complete, commit all work, push the branch, and create a PR to main." > track_4.log 2>&1 &

echo "Re-dispatching Track 5: Clinical Communications & Telehealth..."
claude --dangerously-skip-permissions -p "You are working in an existing git worktree at /Users/scottwayman/ANTIGRAVITY/EMR-wt/track-8-communications on branch scwayman/track-8-communications. cd into that directory. You are assigned to implement Track 5 of Phase 8. Execute all Communications tickets: EMR-033, EMR-034, EMR-037, EMR-143, EMR-146. These tickets exist in TICKETS.md — read the file to find their full descriptions. Focus on physician-to-physician portal, phone/video capability, end-to-end encrypted communication, Zoom integration, and HIPAA voicemail with transcript. When complete, commit all work, push the branch, and create a PR to main." > track_5.log 2>&1 &

echo "Re-dispatching Track 7: Clinician App & AI Workflows..."
claude --dangerously-skip-permissions -p "You are working in an existing git worktree at /Users/scottwayman/ANTIGRAVITY/EMR-wt/track-8-clinician-workflows on branch scwayman/track-8-clinician-workflows. cd into that directory. You are assigned to implement Track 7 of Phase 8. Execute all Clinician AI tickets: EMR-077, EMR-078, EMR-079, EMR-129, EMR-131, EMR-132, EMR-135, EMR-136, EMR-148, EMR-157, EMR-158, EMR-159, EMR-160, EMR-165, EMR-180, EMR-182. These tickets exist as titles in the TICKETS.md summary table — infer requirements from their titles and implement them. Focus on EMAR framework, referrals, dementia screening, breathing break popup, AI clinic notes guardrails, charting timer, voice dictation, consciousness overlay, and multi-med safety checks. When complete, commit all work, push the branch, and create a PR to main." > track_7.log 2>&1 &

echo "Re-dispatching Track 8: Platform Licensing & MIPS..."
claude --dangerously-skip-permissions -p "You are working in an existing git worktree at /Users/scottwayman/ANTIGRAVITY/EMR-wt/track-8-platform-licensing on branch scwayman/track-8-platform-licensing. cd into that directory. You are assigned to implement Track 8 of Phase 8. Execute all Platform tickets: EMR-013, EMR-042, EMR-044, EMR-045, EMR-147, EMR-153, EMR-154, EMR-156, EMR-173. These tickets exist as titles in the TICKETS.md summary table — infer requirements from their titles and implement them. Focus on conventional EMR integration, MIPS data, modular framework, insurance AI, licensing menu, and platform compliance features. When complete, commit all work, push the branch, and create a PR to main." > track_8.log 2>&1 &

echo ""
echo "✅ All 6 stalled tracks have been re-dispatched!"
echo "Tracks 1 (UX Polish) and 6 (DICOM) were already completed."
echo ""
echo "Monitor progress:"
echo "  tail -f track_2.log   # Portal Gamification"
echo "  tail -f track_3.log   # Cannabis Commerce"
echo "  tail -f track_4.log   # Admin Analytics"
echo "  tail -f track_5.log   # Communications"
echo "  tail -f track_7.log   # Clinician Workflows"
echo "  tail -f track_8.log   # Platform Licensing"
