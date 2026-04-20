import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LAUNCH_STEPS,
  getLaunchProgress,
  getLaunchStep,
  type LaunchStepId,
  type OrgLaunchState,
} from "@/lib/domain/practice-launch";
import { LaunchTimeline } from "@/components/operator/launch/launch-timeline";
import { OrgProfilePanel } from "@/components/operator/launch/org-profile-panel";
import { CliniciansPanel } from "@/components/operator/launch/clinicians-panel";
import { PayerConfigPanel } from "@/components/operator/launch/payer-config-panel";
import { IntakeFormsPanel } from "@/components/operator/launch/intake-forms-panel";
import { BillingRulesPanel } from "@/components/operator/launch/billing-rules-panel";
import { GoLivePanel } from "@/components/operator/launch/go-live-panel";

export const metadata = { title: "Practice launch" };

type SavedStepPayload = Record<string, string | number | boolean | null>;
type LaunchStateMap = Partial<Record<LaunchStepId, SavedStepPayload>>;

function coerceLaunchState(value: unknown): LaunchStateMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as LaunchStateMap;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function LaunchPage({
  searchParams,
}: {
  searchParams?: { step?: string; done?: string };
}) {
  const user = await requireUser();
  if (!user.organizationId) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Practice launch"
          title="No organization"
          description="You need to be a member of an organization to run the launch wizard."
        />
      </PageShell>
    );
  }

  const [org, providerCount, intakeFormCount, feeScheduleCount, launchStatus] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true, launchStateJson: true },
    }),
    prisma.provider.count({ where: { organizationId: user.organizationId, active: true } }),
    prisma.intakeFormTemplate.count({ where: { organizationId: user.organizationId } }),
    prisma.feeScheduleEntry.count({ where: { organizationId: user.organizationId } }),
    prisma.practiceLaunchStatus.findUnique({
      where: { organizationId: user.organizationId },
      select: { goLiveAt: true },
    }),
  ]);

  const launchState = coerceLaunchState(org?.launchStateJson);

  // Derive wizard-visible completion from a mix of real schema signals
  // and the form-submission markers stored in launchStateJson.
  const orgState: OrgLaunchState = {
    hasOrgProfile: !!launchState.org_profile,
    clinicianCount: providerCount,
    // No Payer model yet — treat the saved form submission as the signal.
    payerCount: launchState.payer_config ? 1 : 0,
    intakeFormCount: Math.max(intakeFormCount, launchState.intake_forms ? 1 : 0),
    billingRuleCount: Math.max(feeScheduleCount, launchState.billing_rules ? 1 : 0),
    goLiveAt: launchStatus?.goLiveAt ?? null,
  };

  const progress = getLaunchProgress(orgState);

  // Pick the step to display: ?step= query param, else the next
  // incomplete step, else the final step (fully launched case).
  const requestedStep = searchParams?.step && getLaunchStep(searchParams.step) ? (searchParams.step as LaunchStepId) : null;
  const activeStepId: LaunchStepId =
    requestedStep ?? progress.currentStep ?? LAUNCH_STEPS[LAUNCH_STEPS.length - 1]!.id;

  const isDoneBanner = searchParams?.done === "1";
  const orgProfileDefaults = launchState.org_profile;
  const payerConfigDefaults = launchState.payer_config;

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Practice launch"
        title="Launch wizard"
        description="Step through setup — each one takes a minute. You can revisit any step later."
        actions={
          <Badge tone={progress.percentComplete === 100 ? "success" : "accent"}>
            {progress.percentComplete}% complete
          </Badge>
        }
      />

      <LaunchTimeline orgState={orgState} currentStepId={progress.currentStep} />

      {isDoneBanner && progress.percentComplete === 100 && (
        <Card tone="raised" className="mb-6 border-accent/30 bg-accent-soft/40">
          <CardContent className="py-5">
            <p className="font-display text-lg text-text tracking-tight">
              Your practice is live.
            </p>
            <p className="text-sm text-text-muted mt-1">
              Patients can now book visits. Revisit any step above to make changes.
            </p>
          </CardContent>
        </Card>
      )}

      {activeStepId === "org_profile" && (
        <OrgProfilePanel
          defaults={{
            practiceName: str(orgProfileDefaults?.practiceName) ?? org?.name,
            address: str(orgProfileDefaults?.address),
            phone: str(orgProfileDefaults?.phone),
            hours: str(orgProfileDefaults?.hours),
          }}
        />
      )}
      {activeStepId === "clinicians" && <CliniciansPanel clinicianCount={providerCount} />}
      {activeStepId === "payer_config" && (
        <PayerConfigPanel
          defaults={{
            primaryPayer: str(payerConfigDefaults?.primaryPayer),
            ediId: str(payerConfigDefaults?.ediId),
            contact: str(payerConfigDefaults?.contact),
          }}
        />
      )}
      {activeStepId === "intake_forms" && <IntakeFormsPanel intakeFormCount={intakeFormCount} />}
      {activeStepId === "billing_rules" && <BillingRulesPanel />}
      {activeStepId === "go_live" && <GoLivePanel />}
    </PageShell>
  );
}
