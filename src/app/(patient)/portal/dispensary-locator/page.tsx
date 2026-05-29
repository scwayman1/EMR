// EMR-017 — Patient dispensary & provider locator.
//
// Server-side guard + shell. The interactive map and side-list live
// inside `DispensaryLocatorView` (client component) so we can keep
// pin selection state, filters, and the imperative pan/zoom handle
// in one place.

import { redirect } from "next/navigation";

import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { homeForRoles } from "@/lib/rbac/roles";
import { DispensaryLocatorView } from "./dispensary-locator-view";

export const metadata = { title: "Dispensary & provider locator" };

// Simulated origin — SF apothecary district. Until we backfill geocoded
// patient addresses we use this static centroid so the page is always
// rich in local environments.
const SIMULATED_ORIGIN = { lat: 37.7749, lng: -122.4194 };

export default async function DispensaryLocatorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.roles.includes("patient")) {
    redirect(homeForRoles(user.roles));
  }

  const patient = user.organizationId
    ? await prisma.patient.findFirst({
        where: { userId: user.id, organizationId: user.organizationId, deletedAt: null },
        select: {
          firstName: true,
          city: true,
          state: true,
          addressLine1: true,
          postalCode: true,
        },
      })
    : null;

  const homeLabel = patient?.city
    ? `${patient.city}${patient.state ? `, ${patient.state}` : ""}`
    : "Your home";

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Find your circle"
        title="Dispensary & provider locator"
        description="A warm, hand-drawn view of the cannabis-certified dispensaries and clinicians around you. Tap a pin to see hours, ratings, and directions."
      />
      <DispensaryLocatorView
        origin={{ ...SIMULATED_ORIGIN, label: homeLabel }}
      />
      <p className="text-[11px] text-text-subtle mt-6 max-w-md leading-relaxed">
        Locations and distances on this page are illustrative while we backfill
        geocoded patient addresses. Always confirm hours and availability with
        the location directly before you visit.
      </p>
    </PageShell>
  );
}
