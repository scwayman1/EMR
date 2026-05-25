// EMR-044 / EMR-147 — Modular EMR licensing console.
//
// Server entry: loads the org's licensing posture + the comparison
// matrix and hands off to the interactive Michelin-style client
// console. The client owns module toggles, real-time pricing, EHR
// connection stubs, and the brochure export action.

import { requireUser } from "@/lib/auth/session";
import { defaultEntitlement } from "@/lib/platform/modules";
import {
  buildComparisonMatrix,
  buildLicensingPosture,
  loadEntitlement,
  michelinTierProfiles,
} from "@/lib/platform/licensing";
import { menuCourses } from "@/lib/platform/licensing-menu";
import { LicensingConsole } from "./LicensingConsole";

export const metadata = { title: "Licensing — Michelin Menu" };

export default async function OpsLicensingPage() {
  const user = await requireUser();
  const organizationId = user.organizationId ?? "demo-org";
  const entitlement = user.organizationId
    ? await loadEntitlement(organizationId)
    : defaultEntitlement(organizationId);

  const posture = buildLicensingPosture(entitlement);
  const matrix = buildComparisonMatrix();
  const courses = menuCourses();
  const tiers = michelinTierProfiles();

  return (
    <LicensingConsole
      posture={posture}
      matrix={matrix}
      courses={courses}
      tiers={tiers}
    />
  );
}
