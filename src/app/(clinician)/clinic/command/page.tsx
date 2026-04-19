import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Tile } from "@/components/ui/tile";
import { TileGrid } from "@/components/ui/tile-grid";
import { ScheduleTile } from "@/components/command/schedule-tile";
import { MessagesTile } from "@/components/command/messages-tile";
import { PatientSnapshotTile } from "@/components/command/patient-snapshot-tile";

export const metadata = { title: "Command Center" };

/**
 * Clinical Command Center — the clinician's single-pane dashboard.
 *
 * This page is the *shell* for the feature set sketched in the
 * Mission Control notebook: schedule, messages, patient snapshot,
 * mindful break. Each pillar ships as its own PR into its own tile.
 * The framework here is intentionally empty so the tile layout,
 * responsive grid, and nav wiring can be reviewed in isolation
 * before any feature content is written.
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
        description="Your day at a glance. Schedule, messages, patient snapshots, and a mindful reset — all in one place."
      />

      <TileGrid>
        <ScheduleTile user={user} />
        <MessagesTile user={user} />
        <PatientSnapshotTile user={user} />
        <Tile
          eyebrow="Reset"
          title="Mindful Break"
          description="Breathe, move, or take in something beautiful. Ten minutes, then back to work."
          icon="🧘"
          span="1x1"
          href="/clinic/mindful"
          tone="calm"
        />
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
