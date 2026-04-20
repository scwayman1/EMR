"use client";

import { Input, FieldGroup } from "@/components/ui/input";
import { saveLaunchStepAction } from "@/app/(operator)/ops/launch/wizard-actions";
import { PanelShell } from "./panel-shell";

interface Props {
  defaults?: { primaryPayer?: string; ediId?: string; contact?: string };
}

export function PayerConfigPanel({ defaults = {} }: Props) {
  return (
    <form action={saveLaunchStepAction}>
      <input type="hidden" name="_stepId" value="payer_config" />
      <PanelShell
        title="Configure payers"
        description="Add the insurance payer you bill most often — we can import the rest later via CSV."
      >
        <FieldGroup label="Primary payer name" htmlFor="primaryPayer">
          <Input
            id="primaryPayer"
            name="primaryPayer"
            placeholder="Blue Cross Blue Shield of Oregon"
            defaultValue={defaults.primaryPayer ?? ""}
          />
        </FieldGroup>

        <FieldGroup label="EDI payer ID" htmlFor="ediId" hint="Used for electronic claim submission.">
          <Input
            id="ediId"
            name="ediId"
            placeholder="00851"
            defaultValue={defaults.ediId ?? ""}
          />
        </FieldGroup>

        <FieldGroup label="Provider representative (optional)" htmlFor="contact">
          <Input
            id="contact"
            name="contact"
            placeholder="rep@payer.com"
            defaultValue={defaults.contact ?? ""}
          />
        </FieldGroup>
      </PanelShell>
    </form>
  );
}
