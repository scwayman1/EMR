"use client";

import { Input, FieldGroup } from "@/components/ui/input";
import { saveLaunchStepAction } from "@/app/(operator)/ops/launch/wizard-actions";
import { PanelShell } from "./panel-shell";

// Stub panel — captures a handful of headline rates and hands off to
// the richer fee-schedule editor later.

export function BillingRulesPanel() {
  return (
    <form action={saveLaunchStepAction}>
      <input type="hidden" name="_stepId" value="billing_rules" />
      <PanelShell
        title="Set billing rules"
        description="Rough-in your headline rates — you can fine-tune each CPT code in the fee schedule afterwards."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldGroup label="New-patient office visit (99203)" htmlFor="rate_99203">
            <Input id="rate_99203" name="rate_99203" inputMode="decimal" placeholder="250" />
          </FieldGroup>
          <FieldGroup label="Established-patient visit (99213)" htmlFor="rate_99213">
            <Input id="rate_99213" name="rate_99213" inputMode="decimal" placeholder="150" />
          </FieldGroup>
          <FieldGroup label="Telehealth visit (99442)" htmlFor="rate_99442">
            <Input id="rate_99442" name="rate_99442" inputMode="decimal" placeholder="120" />
          </FieldGroup>
          <FieldGroup label="Cannabis certification visit" htmlFor="rate_cannabis_cert">
            <Input id="rate_cannabis_cert" name="rate_cannabis_cert" inputMode="decimal" placeholder="199" />
          </FieldGroup>
        </div>
      </PanelShell>
    </form>
  );
}
