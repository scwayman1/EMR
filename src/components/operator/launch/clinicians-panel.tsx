"use client";

import { Input, FieldGroup } from "@/components/ui/input";
import { saveLaunchStepAction } from "@/app/(operator)/ops/launch/wizard-actions";
import { PanelShell } from "./panel-shell";

interface Props {
  clinicianCount: number;
}

export function CliniciansPanel({ clinicianCount }: Props) {
  return (
    <form action={saveLaunchStepAction}>
      <input type="hidden" name="_stepId" value="clinicians" />
      <PanelShell
        title="Add clinicians"
        description="Invite at least one physician or NP. You can add more later in the clinic directory."
      >
        <div className="rounded-lg bg-surface-muted/60 p-3 text-sm text-text-muted">
          You currently have <strong className="text-text">{clinicianCount}</strong>{" "}
          clinician{clinicianCount === 1 ? "" : "s"} registered.
        </div>

        <FieldGroup label="First clinician — full name" htmlFor="clinicianName">
          <Input
            id="clinicianName"
            name="clinicianName"
            placeholder="Dr. Sam Patel"
          />
        </FieldGroup>

        <FieldGroup label="NPI" htmlFor="npi" hint="10-digit National Provider Identifier.">
          <Input id="npi" name="npi" inputMode="numeric" placeholder="1234567890" />
        </FieldGroup>

        <FieldGroup label="Specialty" htmlFor="specialty">
          <Input
            id="specialty"
            name="specialty"
            placeholder="Internal medicine / cannabis therapeutics"
          />
        </FieldGroup>

        <FieldGroup label="Email" htmlFor="clinicianEmail">
          <Input
            id="clinicianEmail"
            name="clinicianEmail"
            type="email"
            placeholder="doctor@practice.com"
          />
        </FieldGroup>
      </PanelShell>
    </form>
  );
}
