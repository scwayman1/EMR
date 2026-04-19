import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { TileGrid } from "@/components/ui/tile-grid";
import { ScheduleTile } from "@/components/command/schedule-tile";
import { MessagesTile } from "@/components/command/messages-tile";
import { ClinicalFlowTile } from "@/components/command/clinical-flow-tile";
import { ClinicalDiscoveryTile } from "@/components/command/clinical-discovery-tile";
import { PatientImpactTile } from "@/components/command/patient-impact-tile";

export const metadata = { title: "Command Center" };

/**
 * Clinical Command Center — the clinician's single-pane dashboard.
 *
 * Top row carries the operational work — Schedule (pre-visit snapshot
 * lives in the featured card's hover peek) and Messages.
 *
 * Bottom row carries the reflective and assistive work, the narrative
 * arc Dr. Patel wanted: time → insight → action.
 *   - Clinical Flow     — how your day moved (left)
 *   - Clinical Discovery — what you uncovered (middle, agent surface)
 *   - Patient Impact     — who still needs you (right)
 *
 * Accessible to: clinician, practice_owner (enforced at the layout).
 */
export default async function CommandCenterPage() {
  const user = await requireUser();

  const now = new Date();
  const greeting = pickGreeting(now.getHours());

  return (
    <PageShell maxWidth="max-w-[1400px]">
      <PageHeader
        eyebrow="Command Center"
        title={`${greeting}, ${user.firstName}.`}
        description="Your day at a glance — what's happening, what you uncovered, and where you're needed next."
      />

      <TileGrid>
        <ScheduleTile user={user} />
        <MessagesTile user={user} />
        <ClinicalFlowTile user={user} />
        <ClinicalDiscoveryTile user={user} />
        <PatientImpactTile user={user} />
      </TileGrid>
    </PageShell>
  );
}

function pickGreeting(hour: number): string {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}
