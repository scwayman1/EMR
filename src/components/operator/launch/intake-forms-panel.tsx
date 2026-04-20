"use client";

import { FieldGroup } from "@/components/ui/input";
import { saveLaunchStepAction } from "@/app/(operator)/ops/launch/wizard-actions";
import { PanelShell } from "./panel-shell";

interface Props {
  intakeFormCount: number;
}

const PRESETS = [
  { id: "cannabis_basic", label: "Cannabis basics (demographics + qualifying condition)" },
  { id: "cannabis_full", label: "Cannabis full intake (history + meds + goals)" },
  { id: "mental_health", label: "Mental health add-on (PHQ-9 + GAD-7)" },
  { id: "pain", label: "Chronic pain supplement (PEG-3 + sleep)" },
];

export function IntakeFormsPanel({ intakeFormCount }: Props) {
  return (
    <form action={saveLaunchStepAction}>
      <input type="hidden" name="_stepId" value="intake_forms" />
      <PanelShell
        title="Publish intake forms"
        description="Pick the starter form that matches your patient population — you can edit the fields in the intake builder."
      >
        <div className="rounded-lg bg-surface-muted/60 p-3 text-sm text-text-muted">
          {intakeFormCount > 0
            ? `You already have ${intakeFormCount} intake template${intakeFormCount === 1 ? "" : "s"}.`
            : "No intake templates yet — choose a preset to bootstrap one."}
        </div>

        <FieldGroup label="Preset template" htmlFor="preset">
          <div className="space-y-2">
            {PRESETS.map((p, i) => (
              <label
                key={p.id}
                className="flex items-center gap-3 rounded-md border border-border/60 bg-surface px-3 py-2.5 cursor-pointer hover:border-accent/60 hover:bg-accent-soft/30 transition-colors"
              >
                <input
                  type="radio"
                  name="preset"
                  value={p.id}
                  defaultChecked={i === 0}
                  className="h-4 w-4 text-accent focus:ring-accent/30"
                />
                <span className="text-sm text-text">{p.label}</span>
              </label>
            ))}
          </div>
        </FieldGroup>
      </PanelShell>
    </form>
  );
}
