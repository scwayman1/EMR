"use client";

import { Input, Textarea, FieldGroup } from "@/components/ui/input";
import { saveLaunchStepAction } from "@/app/(operator)/ops/launch/wizard-actions";
import { PanelShell } from "./panel-shell";

interface Props {
  defaults?: {
    practiceName?: string;
    address?: string;
    phone?: string;
    hours?: string;
  };
}

export function OrgProfilePanel({ defaults = {} }: Props) {
  return (
    <form action={saveLaunchStepAction}>
      <input type="hidden" name="_stepId" value="org_profile" />
      <PanelShell
        title="Practice profile"
        description="Tell us the basics about your practice so we can pre-fill the rest."
      >
        <FieldGroup label="Practice name" htmlFor="practiceName">
          <Input
            id="practiceName"
            name="practiceName"
            placeholder="Leaf Journey Wellness"
            defaultValue={defaults.practiceName ?? ""}
            required
          />
        </FieldGroup>

        <FieldGroup label="Street address" htmlFor="address">
          <Input
            id="address"
            name="address"
            placeholder="123 Main St, Portland OR 97201"
            defaultValue={defaults.address ?? ""}
          />
        </FieldGroup>

        <FieldGroup label="Phone" htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="(555) 123-4567"
            defaultValue={defaults.phone ?? ""}
          />
        </FieldGroup>

        <FieldGroup label="Hours" htmlFor="hours" hint="Free-form is fine — we'll auto-parse.">
          <Textarea
            id="hours"
            name="hours"
            rows={3}
            placeholder="Mon–Fri 9am–5pm, closed weekends"
            defaultValue={defaults.hours ?? ""}
          />
        </FieldGroup>
      </PanelShell>
    </form>
  );
}
