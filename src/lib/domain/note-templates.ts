// Clinical Note Templates — EMR-174
// Reusable templates for common visit types. AI fills in patient-specific details.

export interface NoteTemplate {
  id: string;
  name: string;
  visitType: string;
  emoji: string;
  blocks: Array<{ type: string; heading: string; body: string }>;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "cannabis-initiation",
    name: "Cannabis Initiation Visit",
    visitType: "New cannabis patient",
    emoji: "\uD83C\uDF3F",
    blocks: [
      { type: "subjective", heading: "Subjective", body: "Patient presents for initial cannabis medicine consultation. Chief complaint: [presenting concern]. Duration: [duration]. Prior treatments tried: [prior treatments]. Cannabis experience: [naive/experienced]. Current medications: [current meds]. Allergies: [allergies]." },
      { type: "assessment", heading: "Assessment", body: "[Age]-year-old [sex] presenting with [condition] suitable for cannabis therapy trial. [Supporting clinical reasoning]. Risk-benefit discussion completed. Patient understands start-low-go-slow approach." },
      { type: "plan", heading: "Plan", body: "1. Initiate cannabis therapy: [product type] [route]\n2. Starting dose: [THC mg] THC + [CBD mg] CBD, [frequency]\n3. Titration schedule: increase by [increment] every [interval] as tolerated\n4. Patient education provided: dosing, side effects, driving restrictions, storage\n5. Follow-up in 2 weeks to assess tolerance and efficacy\n6. Outcome tracking: daily pain/sleep/anxiety logging in portal" },
      { type: "objective", heading: "Objective", body: "Vitals: BP [BP], HR [HR], Wt [weight]\nGeneral: [appearance]\nPsych: [mood/affect]\nRelevant exam: [focused exam findings]" },
    ],
  },
  {
    id: "pain-followup",
    name: "Pain Management Follow-Up",
    visitType: "Follow-up",
    emoji: "\uD83E\uDE7C",
    blocks: [
      { type: "subjective", heading: "Subjective", body: "Patient returns for pain management follow-up. Current pain: [0-10]/10 (was [prior score] at last visit). Location: [location]. Character: [character]. Aggravating factors: [factors]. Current regimen: [current cannabis regimen]. Adherence: [good/fair/poor]. Side effects reported: [any side effects]. Sleep quality: [0-10]/10. Functional status: [improved/stable/declined]." },
      { type: "assessment", heading: "Assessment", body: "Chronic pain [improving/stable/worsening] on current cannabis regimen. Pain score [direction] from [old] to [new]. [Additional assessment]. Treatment goals [being met / partially met / not met]." },
      { type: "plan", heading: "Plan", body: "1. [Continue/Adjust] current regimen: [details]\n2. [Any dose changes with rationale]\n3. Continue outcome logging\n4. Follow-up in [interval]\n5. [Any additional interventions: PT referral, lifestyle modifications, etc.]" },
      { type: "objective", heading: "Objective", body: "Vitals: BP [BP], HR [HR]\nPain assessment: [location, tenderness, ROM]\nFunctional: [gait, grip strength, etc.]\nMood/affect: [observation]" },
    ],
  },
  {
    id: "mental-health-checkin",
    name: "Mental Health Check-In",
    visitType: "Follow-up",
    emoji: "\uD83E\uDDD8",
    blocks: [
      { type: "subjective", heading: "Subjective", body: "Patient presents for mental health follow-up. Mood: [description]. Sleep: [quality, duration]. Anxiety level: [0-10]/10. PHQ-9: [score] (was [prior]). GAD-7: [score] (was [prior]). Stressors: [current stressors]. Coping: [strategies in use]. Cannabis use: [current regimen adherence]. Side effects: [any]. Suicidal ideation: [denied/present — if present, assess safety]." },
      { type: "assessment", heading: "Assessment", body: "[Diagnosis] — [improving/stable/worsening]. PHQ-9 [direction] from [old] to [new]. GAD-7 [direction] from [old] to [new]. [Clinical interpretation]. No acute safety concerns [or describe safety plan if applicable]." },
      { type: "plan", heading: "Plan", body: "1. [Continue/Adjust] CBD regimen: [current dose and any changes]\n2. [Any THC considerations — note anxiety risk]\n3. Reassess PHQ-9 and GAD-7 in 4 weeks\n4. [Therapy referral if applicable]\n5. [Lifestyle: exercise, sleep hygiene, mindfulness]\n6. Follow-up in [interval]\n7. Safety plan reviewed: [yes/no/updated]" },
      { type: "objective", heading: "Objective", body: "Appearance: [grooming, eye contact]\nBehavior: [cooperative, anxious, withdrawn]\nMood: [stated]\nAffect: [observed — congruent/incongruent, range]\nThought process: [linear, goal-directed]\nThought content: [no SI/HI, no delusions]\nCognition: [alert, oriented]" },
    ],
  },
  {
    id: "medication-adjustment",
    name: "Medication Adjustment",
    visitType: "Follow-up",
    emoji: "\u2696\uFE0F",
    blocks: [
      { type: "subjective", heading: "Subjective", body: "Patient presents for medication adjustment. Current regimen: [product, dose, frequency]. Reason for adjustment: [inadequate relief / side effects / tolerance / patient preference]. Current symptom status: [symptoms and severity]. Duration on current dose: [duration]. Adherence: [assessment]." },
      { type: "assessment", heading: "Assessment", body: "Current cannabis regimen [subtherapeutic / causing side effects / appropriate but needs fine-tuning]. [Clinical rationale for change]. Drug interaction check: [clear / flagged — detail if flagged]. Contraindication screen: [clear / noted]." },
      { type: "plan", heading: "Plan", body: "1. Adjust regimen:\n   - Previous: [old dose/product]\n   - New: [new dose/product]\n   - Rationale: [why]\n2. Titration: [schedule if applicable]\n3. Monitor for: [specific things to watch]\n4. Follow-up in [interval] to reassess\n5. Patient instructed on new dosing schedule" },
      { type: "objective", heading: "Objective", body: "Vitals: [relevant vitals]\nRelevant exam: [focused findings]\nCurrent labs if applicable: [lab values]" },
    ],
  },
  {
    id: "wellness-exam",
    name: "Annual Wellness Exam",
    visitType: "Wellness",
    emoji: "\uD83C\uDF1F",
    blocks: [
      { type: "subjective", heading: "Subjective", body: "Patient presents for annual wellness exam. General health status: [good/fair/poor]. New concerns since last visit: [any]. Preventive care: [vaccinations, screenings due]. Lifestyle: sleep [hours], exercise [frequency], diet [quality], stress [level]. Cannabis use: [current regimen summary]. Substance use: [tobacco, alcohol, other]. Social history updates: [any changes]." },
      { type: "assessment", heading: "Assessment", body: "1. [Primary diagnosis] — [status]\n2. [Secondary diagnosis if applicable] — [status]\n3. Preventive care: [up to date / overdue items]\n4. Cannabis therapy: [effective/needs adjustment]\n5. Overall health trajectory: [improving/stable/declining]" },
      { type: "plan", heading: "Plan", body: "1. Continue current care plan: [summary]\n2. Preventive: [screenings/labs ordered]\n3. Cannabis: [continue/adjust — detail]\n4. Lifestyle goals: [specific recommendations]\n5. Referrals: [any needed]\n6. Follow-up: routine in [interval]" },
      { type: "objective", heading: "Objective", body: "Vitals: BP [BP], HR [HR], Wt [weight], BMI [BMI]\nGeneral: [appearance]\nHEENT: [findings]\nCardiovascular: [findings]\nRespiratory: [findings]\nAbdomen: [findings]\nMusculoskeletal: [findings]\nNeuro: [findings]\nPsych: [mood, affect]\nSkin: [findings]" },
    ],
  },
];

export function getTemplate(id: string): NoteTemplate | null {
  return NOTE_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function getAllTemplates(): NoteTemplate[] {
  return [...NOTE_TEMPLATES];
}
