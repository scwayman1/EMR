#!/bin/bash

# Setup Swarm Branches Phase 2
# This script creates 30 perfectly isolated branches based on the SWARM_MATRIX_2.md
# and dumps an instruction prompt into each branch so the parallel agents know exactly what to do.

echo "🚀 Preparing Phase 2 Epic Swarm Environment (31-60)..."

# Ensure we are on main and up to date
git checkout main
git pull origin main

TICKETS_TEXT="feat/swarm-31-oura|Build the Oura Ring Data Parser (EMR-050) in src/lib/integrations/oura-parser.ts.
feat/swarm-32-healthkit|Build the Apple HealthKit Normalizer (EMR-051) in src/lib/integrations/healthkit-normalizer.ts.
feat/swarm-33-fitbit|Build the Fitbit Activity Sync (EMR-052) in src/lib/integrations/fitbit-sync.ts.
feat/swarm-34-whoop|Build the Whoop Strain Score Mapper (EMR-053) in src/lib/integrations/whoop-mapper.ts.
feat/swarm-35-garmin|Build the Garmin Vitals Ingestion (EMR-054) in src/lib/integrations/garmin-ingestion.ts.
feat/swarm-36-dexcom|Build the Dexcom CGM API Client (EMR-055) in src/lib/integrations/dexcom-api.ts.
feat/swarm-37-retention|Build the Patient Retention Chart (EMR-056) in src/components/analytics/retention-chart.tsx.
feat/swarm-38-efficacy|Build the Modality Efficacy Scatter (EMR-057) in src/components/analytics/efficacy-scatter.tsx.
feat/swarm-39-revenue|Build the Revenue by Provider Table (EMR-058) in src/components/analytics/revenue-table.tsx.
feat/swarm-40-chemovars|Build the Top Chemovars Leaderboard (EMR-059) in src/components/analytics/chemovar-leaderboard.tsx.
feat/swarm-41-demographics|Build the Demographics Pie Chart (EMR-060) in src/components/analytics/demographics-chart.tsx.
feat/swarm-42-noshows|Build the No-Show Rate Trend Line (EMR-061) in src/components/analytics/no-show-trend.tsx.
feat/swarm-43-pain-form|Build the Pain Quality Assessment form (EMR-062) in src/components/intake/pain-quality-form.tsx.
feat/swarm-44-psqi|Build the Sleep Quality Index (PSQI) form (EMR-063) in src/components/intake/psqi-form.tsx.
feat/swarm-45-gad7|Build the Anxiety Screener (GAD-7) form (EMR-064) in src/components/intake/gad7-screener.tsx.
feat/swarm-46-phq9|Build the Depression Screener (PHQ-9) form (EMR-065) in src/components/intake/phq9-screener.tsx.
feat/swarm-47-pcl5|Build the PTSD Screener (PCL-5) form (EMR-066) in src/components/intake/pcl5-screener.tsx.
feat/swarm-48-cudit|Build the Cannabis Use Test (CUDIT) form (EMR-067) in src/components/intake/cudit-screener.tsx.
feat/swarm-49-hpi|Build the Subjective: HPI Editor component (EMR-068) in src/components/clinical/soap/subjective-hpi.tsx.
feat/swarm-50-vitals-snap|Build the Objective: Vitals Snapshot component (EMR-069) in src/components/clinical/soap/objective-vitals.tsx.
feat/swarm-51-icd10|Build the Assessment: ICD-10 Search component (EMR-070) in src/components/clinical/soap/assessment-icd10.tsx.
feat/swarm-52-eprescribe|Build the Plan: E-Prescribe Button component (EMR-071) in src/components/clinical/soap/plan-eprescribe.tsx.
feat/swarm-53-followup|Build the Follow-up Interval Picker component (EMR-072) in src/components/clinical/soap/follow-up-selector.tsx.
feat/swarm-54-care-team|Build the Care Team Tagger Input component (EMR-073) in src/components/clinical/soap/care-team-tagger.tsx.
feat/swarm-55-waiting-room|Build the Telehealth Waiting Room component (EMR-074) in src/components/telehealth/waiting-room.tsx.
feat/swarm-56-call-controls|Build the Video Call Controls component (EMR-075) in src/components/telehealth/call-controls.tsx.
feat/swarm-57-screen-share|Build the Screen Share Button component (EMR-076) in src/components/telehealth/screen-share-btn.tsx.
feat/swarm-58-waitlist|Build the Appointment Waitlist Card component (EMR-077) in src/components/scheduling/waitlist-card.tsx.
feat/swarm-59-sms-toggle|Build the SMS Reminder Toggle component (EMR-078) in src/components/scheduling/sms-reminder-toggle.tsx.
feat/swarm-60-time-off|Build the Provider Time-off Block component (EMR-079) in src/components/scheduling/time-off-block.tsx."

echo "$TICKETS_TEXT" | while IFS="|" read -r BRANCH TASK; do
    git checkout main
    
    # If branch already exists, delete it to ensure clean slate
    if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
        git branch -D "$BRANCH"
    fi
    
    git checkout -b "$BRANCH"
    
    cat > .agent-prompt.md <<EOF
# AGENT INSTRUCTIONS

**Your Task:**
$TASK

**CRITICAL CONSTRAINTS:**
1. YOU ARE ONLY ALLOWED TO CREATE/EDIT THE FILE MENTIONED ABOVE. 
2. Do NOT edit any global layout files, schema files, or anything outside of your isolated scope. If you need a utility that doesn't exist, mock it locally within your file.
3. You must make the component beautiful, responsive, and aligned with Verdant Apothecary / Leafjourney styling.
4. When you are finished, you MUST run \`npm run typecheck\` and \`npm run lint\` and fix any errors.
5. Once tests pass, commit your code to this branch with \`git add . && git commit -m "feat: \$(your ticket)" && git push -u origin $BRANCH\`
6. Finally, use \`gh pr create --title "\$TASK" --body "Automated PR"\` followed by \`gh pr merge --auto --squash\` to create a PR into main and set it to auto-merge.

This is a parallelized swarm operation. Strict file isolation guarantees zero merge conflicts tomorrow morning. 
DO NOT FAIL YOUR ISOLATION PROTOCOL.
EOF

    git add .agent-prompt.md
    git commit -m "chore: setup swarm instructions for $BRANCH"
    
    echo "✅ Prepared $BRANCH"
done

git checkout main
echo "🎉 Swarm environment successfully generated!"
echo "Check out SWARM_MATRIX_2.md for the master plan."
