// EMR-002 / EMR-017 — Geo-radius dispensary lookup.
//
// GET /api/dispensary/nearby?lat=42.36&lng=-71.06&radius=30
//   Returns dispensaries within `radius` miles, sorted by distance.
//
// While we wait on real partner data, this serves the mock dataset
// from src/lib/dispensary/mock-locations.ts so the locator UI has
// something to render. When real Vendors with geo metadata land,
// swap the source to a Prisma query.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { haversineMiles } from "@/lib/dispensary/geo";
import type { NearbyDispensaryRow } from "@/lib/dispensary/types";

export const runtime = "nodejs";

const DEFAULT_RADIUS_MILES = 30;
const MAX_RADIUS_MILES = 100;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const radius = Math.min(
    MAX_RADIUS_MILES,
    Number(url.searchParams.get("radius") ?? DEFAULT_RADIUS_MILES),
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "missing_or_invalid_coords", required: ["lat", "lng"] },
      { status: 400 },
    );
  }

  const origin = { lat, lng };

  const vendors = await prisma.vendor.findMany({
    where: {
      status: "active",
      vendorType: "licensed_dispensary",
      latitude: { not: null },
      longitude: { not: null },
    },
  });

  const rows: NearbyDispensaryRow[] = vendors
    .map((v) => {
      const geo = {
        lat: v.latitude!,
        lng: v.longitude!,
        addressLine1: v.addressLine1 || "",
        addressLine2: v.addressLine2 || undefined,
        city: v.city || "",
        state: v.state || "",
        postalCode: v.postalCode || "",
      };
      return {
        id: v.id,
        slug: v.slug,
        name: v.name,
        geo,
        skuCount: 0, // Should be an aggregate or count in production
        distanceMiles: Number(haversineMiles(origin, geo).toFixed(2)),
      };
    })
    .filter((r) => r.distanceMiles <= radius)
    .sort((a, b) => a.distanceMiles - b.distanceMiles);

  return NextResponse.json({
    origin,
    radiusMiles: radius,
    count: rows.length,
    dispensaries: rows,
  });
}
