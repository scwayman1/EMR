import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Tile, TilePlaceholder } from "@/components/ui/tile";
import { TileGrid } from "@/components/ui/tile-grid";

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
            to visit duration, hover to preview the facesheet. */}
        <Tile
          eyebrow="Today"
          title="Schedule"
          description="Time-sized patient cards with AI-summarized reason for visit."
          icon="📅"
          span="2x2"
          href="/clinic"
          tone="default"
        >
          <TilePlaceholder note="Schedule tile ships next. Tap to preview today in the current view." />
        </Tile>

        {/* Pillar 2 — Messages. AI-summarized inbox with keyword priority
            (urgent in red), inline C/M/Rx/📞 actions, voice dictation. */}
        <Tile
          eyebrow="Inbox"
          title="Messages"
          description="AI-summarized, priority-sorted. Urgent floats to the top."
          icon="💬"
          span="1x2"
          href="/clinic/messages"
          tone="warm"
        >
          <TilePlaceholder note="Summaries + quick actions land in slice 2." />
        </Tile>

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

        {/* Pillar 4 — Mindful break. Click → 10-min max reset (breathe, move,
            game, tranquil picture/sound). "Back to work!" on exit. */}
        <Tile
          eyebrow="Reset"
          title="Mindful Break"
          description="Breathe, move, or play for up to ten minutes. Back to work when you're ready."
          icon="🧘"
          span="1x1"
          href="#"
          tone="calm"
        >
          <TilePlaceholder note="Full module in slice 4." />
        </Tile>

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
