"use client";

import { saveLaunchStepAction } from "@/app/(operator)/ops/launch/wizard-actions";
import { PanelShell } from "./panel-shell";

// Stub panel — the final "flip the switch" confirmation.

export function GoLivePanel() {
  return (
    <form action={saveLaunchStepAction}>
      <input type="hidden" name="_stepId" value="go_live" />
      <PanelShell
        title="Go live"
        description="Everything's set. When you submit, patients can book and see your practice immediately."
        submitLabel="Launch practice"
      >
        <div className="rounded-lg border border-accent/30 bg-accent-soft/40 p-4 text-sm text-text">
          <p className="font-medium mb-1">Pre-flight check</p>
          <ul className="list-disc pl-5 space-y-1 text-text-muted">
            <li>Profile saved, clinicians invited</li>
            <li>Payers and intake forms configured</li>
            <li>Fee schedule roughed in</li>
          </ul>
          <p className="mt-3 text-xs text-text-subtle">
            You can keep editing after launch — nothing is permanent.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" name="confirmReady" value="yes" required className="h-4 w-4" />
          <span>I confirm the practice is ready to see patients.</span>
        </label>
      </PanelShell>
    </form>
  );
}
