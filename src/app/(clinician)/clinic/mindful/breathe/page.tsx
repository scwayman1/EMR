import { requireUser } from "@/lib/auth/session";
import { BreathingSession } from "@/components/mindful/breathing-session";

export const metadata = { title: "Breathe" };

/**
 * Breathing session route. The actual animation + timer live in a
 * client component so the page stays a thin server wrapper; all this
 * file does is gate the route and hand over to BreathingSession.
 *
 * The surrounding clinician AppShell still renders (nav sidebar etc),
 * but the session body itself is centered and quiet — no secondary
 * UI competes for attention during the break.
 */
export default async function BreathePage() {
  await requireUser();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-16">
      <BreathingSession />
    </div>
  );
}
