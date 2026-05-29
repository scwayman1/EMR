// EMR-017 — Dispensary Locator with Google Maps.
//
// Data + URL builders for an embedded map of local dispensaries and cannabis
// healthcare providers. The map uses the Google Maps Embed API when a key is
// configured (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY); every helper degrades to
// keyless google.com/maps links so the locator still works without a key.

import { haversineMiles, type GeoPoint } from "./dispensary-sync";

export type MapPinKind = "dispensary" | "provider";

export interface MapPin extends GeoPoint {
  id: string;
  kind: MapPinKind;
  name: string;
  address: string;
  phone?: string;
  hours?: string;
}

export const DISPENSARY_PINS: MapPin[] = [
  { id: "disp-1", kind: "dispensary", name: "Green Cross — Irvine", address: "2600 Main St, Irvine, CA 92614", phone: "(949) 555-0148", hours: "9am–9pm daily", lat: 33.6846, lng: -117.8265 },
  { id: "disp-2", kind: "dispensary", name: "Coastal Leaf — Newport", address: "120 Pacific Ave, Newport Beach, CA 92661", phone: "(949) 555-0172", hours: "10am–8pm daily", lat: 33.6189, lng: -117.9298 },
  { id: "disp-3", kind: "dispensary", name: "Harbor Wellness — Long Beach", address: "500 Ocean Blvd, Long Beach, CA 90802", phone: "(562) 555-0190", hours: "8am–10pm daily", lat: 33.7701, lng: -118.1937 },
  { id: "disp-4", kind: "dispensary", name: "High Desert Rx — Riverside", address: "900 University Ave, Riverside, CA 92507", phone: "(951) 555-0123", hours: "9am–8pm daily", lat: 33.9806, lng: -117.3755 },
];

export const PROVIDER_PINS: MapPin[] = [
  { id: "prov-1", kind: "provider", name: "Leafjourney Cannabis Clinic — Irvine", address: "18100 Von Karman Ave, Irvine, CA 92612", phone: "(949) 555-0100", hours: "Mon–Fri 8am–5pm", lat: 33.6792, lng: -117.8533 },
  { id: "prov-2", kind: "provider", name: "Pacific Integrative Medicine", address: "4 Hutton Centre Dr, Santa Ana, CA 92707", phone: "(714) 555-0166", hours: "Mon–Sat 9am–6pm", lat: 33.7045, lng: -117.8678 },
  { id: "prov-3", kind: "provider", name: "Coastline Cannabis Health", address: "1100 Quail St, Newport Beach, CA 92660", phone: "(949) 555-0181", hours: "Mon–Fri 9am–5pm", lat: 33.6603, lng: -117.8651 },
];

export const ALL_PINS: MapPin[] = [...DISPENSARY_PINS, ...PROVIDER_PINS];

/** Pins within `radiusMiles` of an origin, nearest first, with distance. */
export function pinsWithinRadius(
  origin: GeoPoint,
  radiusMiles = 30,
  pins: MapPin[] = ALL_PINS,
): Array<MapPin & { distanceMiles: number }> {
  return pins
    .map((p) => ({ ...p, distanceMiles: Math.round(haversineMiles(origin, p) * 10) / 10 }))
    .filter((p) => p.distanceMiles <= radiusMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
}

/** Public Google Maps directions link to a pin (no API key required). */
export function directionsUrl(pin: MapPin): string {
  const dest = encodeURIComponent(`${pin.name}, ${pin.address}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
}

/** Keyless place-search link (fallback when no embed key is configured). */
export function placeSearchUrl(pin: MapPin): string {
  const q = encodeURIComponent(`${pin.name}, ${pin.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/**
 * Google Maps Embed API URL for an iframe, or `null` when no key is set.
 * Centres a search for dispensaries + clinics; falls back to a query string
 * the keyless callers can ignore.
 */
export function buildMapEmbedUrl(
  apiKey: string | undefined,
  query = "cannabis dispensary OR cannabis clinic in Orange County CA",
): string | null {
  if (!apiKey) return null;
  const q = encodeURIComponent(query);
  return `https://www.google.com/maps/embed/v1/search?key=${apiKey}&q=${q}`;
}
