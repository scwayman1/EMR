// EMR-002/EMR-017 — geographic helpers for the dispensary locator.
//
// Distance is the Haversine great-circle distance, in statute miles
// (the unit Dr. Patel's spec uses for the "30-mile radius" filter).

const EARTH_RADIUS_MILES = 3958.7613;

export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function withinRadius(
  origin: { lat: number; lng: number },
  point: { lat: number; lng: number },
  radiusMiles: number,
): boolean {
  return haversineMiles(origin, point) <= radiusMiles;
}
