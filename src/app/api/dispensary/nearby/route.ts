// EMR-002 — Dispensary geographic locator endpoint.
//
// GET /api/dispensary/nearby?address=...&radius=30
// Geocodes the supplied address, fetches active dispensaries, and
// returns distance-sorted results within `radius` miles (default 30).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { filterNearby, geocodeAddress } from "@/lib/dispensary";

export const runtime = "nodejs";

const DEFAULT_RADIUS_MILES = 30;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get("address")?.trim() ?? "";
  if (address.length === 0) {
    return NextResponse.json({ error: "address_required" }, { status: 400 });
  }

  let radiusMiles = DEFAULT_RADIUS_MILES;
  const radiusParam = url.searchParams.get("radius");
  if (radiusParam !== null) {
    const parsed = Number(radiusParam);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json({ error: "invalid_radius" }, { status: 400 });
    }
    radiusMiles = parsed;
  }

  const origin = await geocodeAddress(address);

  const rows = await prisma.dispensary.findMany({
    where: { status: "active" },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      latitude: true,
      longitude: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      phone: true,
      websiteUrl: true,
      hoursLine: true,
      lastSyncedAt: true,
      _count: { select: { skus: { where: { active: true, inStock: true } } } },
    },
  });

  const dispensaryRows = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    status: r.status,
    latitude: r.latitude,
    longitude: r.longitude,
    addressLine1: r.addressLine1,
    addressLine2: r.addressLine2,
    city: r.city,
    state: r.state,
    postalCode: r.postalCode,
    phone: r.phone,
    websiteUrl: r.websiteUrl,
    hoursLine: r.hoursLine,
    lastSyncedAt: r.lastSyncedAt,
    skuCount: r._count.skus,
  }));

  const results = filterNearby(dispensaryRows, origin, radiusMiles);

  return NextResponse.json({ origin, radiusMiles, results });
}
