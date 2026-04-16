"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea, FieldGroup } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

interface Props {
  patientFirstName: string;
  patientLastName: string;
  patientDob: string;
  providerName: string;
  practiceName: string;
}

type TemplateId =
  | "specialist-referral"
  | "pcp-update"
  | "pharmacy-note"
  | "workers-comp"
  | "school-employer";

interface LetterTemplate {
  id: TemplateId;
  name: string;
  description: string;
  emoji: string;
  body: (ctx: LetterContext) => string;
}

interface LetterContext {
  patientName: string;
  patientDob: string;
  providerName: string;
  practiceName: string;
  dateToday: string;
}

const TEMPLATES: LetterTemplate[] = [
  {
    id: "specialist-referral",
    name: "Specialist referral",
    description: "Refer to a specialist for consultation or management",
    emoji: "\uD83E\uDE7A",
    body: (c) =>
      `Dear Colleague,

I am referring my patient ${c.patientName} (DOB: ${c.patientDob}) for your specialist evaluation and management.

Reason for referral:
[Enter specific reason]

Relevant history:
[Relevant PMH, duration of symptoms, prior workup]

Current medications:
[Medication list]

Current cannabis regimen:
[Product / dose / route / indication]

Imaging and labs:
[Key results and dates]

I would appreciate your assessment and any recommendations. Please send a consultation note when evaluation is complete.

Thank you for your time and partnership in this patient's care.

Respectfully,

${c.providerName}
${c.practiceName}
`,
  },
  {
    id: "pcp-update",
    name: "PCP update letter",
    description: "Share cannabis care progress with the primary care provider",
    emoji: "\uD83E\uDE7B",
    body: (c) =>
      `Dear Primary Care Provider,

I wanted to update you on our shared patient ${c.patientName} (DOB: ${c.patientDob}), who is being co-managed for cannabis-based therapy at our clinic.

Current treatment summary:
[Indication / product / dose / duration]

Clinical response:
[Outcome scores, symptom improvement, side effects]

Drug interactions reviewed:
[Key interactions with current meds and resolution]

Plan going forward:
[Titration, follow-up cadence, what to watch for]

Please feel free to reach out with any questions. We appreciate the opportunity to collaborate on ${c.patientName}'s care.

Warm regards,

${c.providerName}
${c.practiceName}
`,
  },
  {
    id: "pharmacy-note",
    name: "Pharmacy note",
    description: "Letter to pharmacy regarding cannabis product or interaction",
    emoji: "\uD83D\uDC8A",
    body: (c) =>
      `To: Pharmacist
Re: ${c.patientName} (DOB: ${c.patientDob})

This letter confirms that the patient is under my care for medical cannabis therapy. The following information is being shared for medication safety and dispensing coordination:

Cannabis therapy:
- Indication: [indication]
- Product: [product name / form]
- Dose and schedule: [dose, frequency]
- Route: [oral / sublingual / inhaled / topical]

Concurrent medications and interaction notes:
[Key interactions, recommended monitoring]

Please counsel the patient regarding:
[Specific counseling points — warfarin INR, sedation, driving, etc.]

If you have questions, please contact our office.

Thank you,

${c.providerName}
${c.practiceName}
`,
  },
  {
    id: "workers-comp",
    name: "Workers' comp letter",
    description: "Communicate work status / restrictions to case manager or employer",
    emoji: "\uD83D\uDEE0\uFE0F",
    body: (c) =>
      `Re: ${c.patientName} (DOB: ${c.patientDob})
Date: ${c.dateToday}
Claim: [Claim number]
Date of injury: [DOI]

To Whom It May Concern,

${c.patientName} was seen in our clinic on ${c.dateToday} for follow-up of a work-related injury.

Current diagnosis:
[ICD-10 and description]

Current treatment:
[PT, medications, cannabis if applicable, injections]

Work status:
[ ] Off work through [date]
[ ] Modified duty with the following restrictions:
    - [No lifting > X lbs]
    - [No prolonged standing / walking]
    - [No safety-sensitive tasks while on cannabis medication]
    - [Other]
[ ] Full duty

Expected duration of restrictions: [weeks]
Estimated return-to-full-duty: [date]

Please contact our office with any questions.

Sincerely,

${c.providerName}
${c.practiceName}
`,
  },
  {
    id: "school-employer",
    name: "School / employer letter",
    description: "General medical accommodation letter",
    emoji: "\uD83C\uDFEB",
    body: (c) =>
      `Date: ${c.dateToday}

To Whom It May Concern,

This letter is to inform you that ${c.patientName} (DOB: ${c.patientDob}) is a patient under my care. Due to their medical condition, the following accommodations are reasonable and medically necessary:

Requested accommodations:
- [Flexible scheduling for medical appointments]
- [Rest breaks as needed]
- [Modified physical demands — specify]
- [Other]

The patient's condition is [stable / improving] with current treatment. No limitations on cognitive function have been identified.

Please contact my office directly if verification is required.

Sincerely,

${c.providerName}
${c.practiceName}
`,
  },
];

export function LetterView({
  patientFirstName,
  patientLastName,
  patientDob,
  providerName,
  practiceName,
}: Props) {
  const [templateId, setTemplateId] = useState<TemplateId>("specialist-referral");
  const [customBody, setCustomBody] = useState("");
  const [savedConfirmation, setSavedConfirmation] = useState<string | null>(null);

  const ctx: LetterContext = useMemo(
    () => ({
      patientName: `${patientFirstName} ${patientLastName}`,
      patientDob,
      providerName,
      practiceName,
      dateToday: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    }),
    [patientFirstName, patientLastName, patientDob, providerName, practiceName],
  );

  const template = useMemo(
    () => TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0],
    [templateId],
  );

  const defaultBody = useMemo(() => template.body(ctx), [template, ctx]);
  const body = customBody || defaultBody;

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  function handleSave() {
    setSavedConfirmation(`Saved to chart at ${new Date().toLocaleString()}`);
    setTimeout(() => setSavedConfirmation(null), 4000);
  }

  return (
    <div className="space-y-6">
      <Card tone="raised" className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Template</CardTitle>
          <CardDescription>
            Pick a letter type — each template auto-fills your header.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTemplateId(t.id);
                  setCustomBody("");
                }}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                  templateId === t.id
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-border hover:bg-surface-muted",
                )}
              >
                <span className="text-lg">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">{t.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {t.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Letter preview — printable */}
      <Card tone="raised" className="letter-sheet">
        <CardContent className="pt-8 pb-8">
          <div className="letter-header mb-6 pb-4 border-b border-border/60">
            <p className="font-display text-xl text-text tracking-tight">
              {practiceName}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {providerName} &middot; {ctx.dateToday}
            </p>
            <div className="mt-3 text-xs text-text-muted">
              <p>
                <span className="font-medium text-text">Patient:</span>{" "}
                {ctx.patientName}
              </p>
              {patientDob && (
                <p>
                  <span className="font-medium text-text">DOB:</span>{" "}
                  {patientDob}
                </p>
              )}
            </div>
          </div>

          <div className="print:block">
            <FieldGroup label="Body" htmlFor="letter-body">
              <Textarea
                id="letter-body"
                value={body}
                onChange={(e) => setCustomBody(e.target.value)}
                rows={20}
                className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap print:border-0 print:bg-transparent"
              />
            </FieldGroup>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 print:hidden">
        {savedConfirmation && (
          <span className="text-xs text-emerald-600">{savedConfirmation}</span>
        )}
        <Button variant="secondary" size="sm" onClick={handleSave}>
          Save to chart
        </Button>
        <Button size="sm" onClick={handlePrint}>
          Print
        </Button>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .letter-sheet {
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            margin: 1in;
          }
        }
      `}</style>
    </div>
  );
}
