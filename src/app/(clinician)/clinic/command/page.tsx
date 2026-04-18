import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Tile, TilePlaceholder } from "@/components/ui/tile";
import { TileGrid } from "@/components/ui/tile-grid";
import { ScheduleTile } from "@/components/command/schedule-tile";
import { MessagesTile } from "@/components/command/messages-tile";

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
        {/* Pillar 1 — Schedule. Today's patients, card height proportional
            to visit duration. Real component now live. */}
        <ScheduleTile user={user} />

        {/* Pillar 2 — Messages. AI-triaged inbox preview, urgent in red.
            Reuses the existing smart-inbox triage logic so the tile and
            the full inbox agree on priority/category. */}
        <MessagesTile user={user} />

        {/* Pillar 3 — Patient snapshot. Hover over a patient → facesheet
            preview (vitals, meds, labs sparklines, surgeries). */}
        <Tile
          eyebrow="Roster"
          title="Patient Snapshot"
          description="Hover any patient to see vitals, meds, trending labs, and preventatives."
          icon="👤"
          span="1x1"
          href="/clinic/patients"
          tone="accent"
        >
          <TilePlaceholder note="Hover-preview comes in slice 3." />
        </Tile>

        {/* Pillar 4 — Mindful break. Breathe is live; Move and Inspire
            land as their own slices. 10-minute cap on every path. */}
        <Tile
          eyebrow="Reset"
          title="Mindful Break"
          description="Breathe, move, or take in something beautiful. Ten minutes, then back to work."
          icon="🧘"
          span="1x1"
          href="/clinic/mindful"
          tone="calm"
        />

        {/* Placeholder tile — reminds us that the tabbed sidebar is Phase 3
            and should land once the four content pillars are in. Using a
            non-clickable tile so it doesn't pretend to be functional. */}
        <Tile
          eyebrow="Navigation"
          title="Tabbed Sidebar"
          description="Google-tab style, draggable, hover to peek the last 3–5 entries per tab."
          icon="🗂️"
          span="1x1"
          tone="default"
        >
          <TilePlaceholder note="Phase 3 — after the four pillars are in." />
        </Tile>
      </TileGrid>

      <p className="mt-12 text-xs text-text-subtle italic text-center">
        Framework preview · content ships tile by tile · each slice is its own PR.
      </p>
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
