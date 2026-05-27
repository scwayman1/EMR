import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { lex } from "@/lib/lexicon";
import {
  filterByRadius,
  computeQuarterProgress,
} from "@/lib/domain/volunteer";
import {
  DEMO_OPPORTUNITIES,
  buildDemoHours,
  DEFAULT_HOME,
} from "@/lib/domain/volunteer-demo";
import { VolunteerView } from "./volunteer-view";

export const metadata = { title: "Volunteer & Donate" };

const DEFAULT_RADIUS = 30;

export default async function VolunteerPage() {
  const user = await requireRole("patient");

  const opportunities = filterByRadius(DEMO_OPPORTUNITIES, DEFAULT_HOME, DEFAULT_RADIUS);
  const hours = buildDemoHours(user.id);
  const progress = computeQuarterProgress(hours);

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow={lex("program.volunteer")}
        title="Plant your hours, harvest a healthier community"
        description="We are not just creating a better EMR. We are creating better humans. Your verified volunteer hours unlock platform discounts and seeds for your trove — or donate the value to a charity."
      />
      <VolunteerView
        opportunities={opportunities}
        hours={hours}
        progress={progress}
        userName={`${user.firstName}`}
      />
    </PageShell>
  );
}
