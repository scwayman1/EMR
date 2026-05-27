// EMR-151 — Symptom/Diagnosis Supplement Combo Wheel.
//
// Patient-facing supplement explorer — companion to the cannabis
// combo wheel. Lists evidence-based supplements grouped by category,
// shows overlap when multiple are selected, and flags any cannabis
// interactions to bring up with the care team.

import { redirect } from "next/navigation";

import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import { SupplementWheel } from "@/components/education/SupplementWheel";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/rbac/roles";
import { getSupplementCompounds } from "@/lib/domain/supplement-wheel-server";

export const metadata = { title: "Supplement Wheel" };

export default async function SupplementWheelPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.roles.includes("patient")) {
    redirect(ROLE_HOME[user.roles[0]] ?? "/");
  }

  const compounds = await getSupplementCompounds();

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <div className="mb-8 text-center">
        <Eyebrow className="justify-center mb-3 text-accent">
          Leafjourney Proprietary Tool
        </Eyebrow>
        <PageHeader
          title="Supplement Wheel"
          description="Build a supplement stack and see how it overlaps with your symptoms — designed to complement, not replace, your cannabis regimen."
        />
      </div>

      <SupplementWheel compounds={compounds} />

      <p className="text-[11px] text-text-subtle mt-10 max-w-2xl mx-auto leading-relaxed text-center">
        This tool is educational. Always discuss new supplements with your
        care team before adding them to your regimen — especially if you take
        prescription medications or are pregnant.
      </p>
    </PageShell>
  );
}
