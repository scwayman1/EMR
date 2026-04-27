"use client";

// EMR-017 — Dispensary locator with Google Maps inlay.
//
// Renders a 30-mile-radius search around the patient's (or clinician's)
// location and shows nearby dispensaries with the SKUs each one carries.
//
// The map itself uses the Google Maps Embed API via a sandboxed iframe.
// We chose Embed over the JS SDK + @react-google-maps/api because:
//   1. No npm dep churn — Embed works with just an API key
//   2. Embed enforces the API key restriction at the URL layer
//   3. The whole UI degrades gracefully when no key is configured
//
// When NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing we render a placeholder
// map plate that still shows pins as a styled list — useful for dev,
// CI screenshots, and demos.

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { NearbyDispensaryRow } from "@/lib/dispensary/types";

const DEFAULT_ORIGIN = { lat: 42.3601, lng: -71.0589 }; // Boston fallback
const RADIUS_OPTIONS = [10, 30, 50] as const;
type Radius = (typeof RADIUS_OPTIONS)[number];

interface Props {
  /** Optional patient or clinician home coordinates. Defaults to Boston. */
  initialOrigin?: { lat: number; lng: number };
  initialRadiusMiles?: Radius;
}

export function DispensaryLocator({
  initialOrigin,
  initialRadiusMiles = 30,
}: Props) {
  const [origin, setOrigin] = useState(initialOrigin ?? DEFAULT_ORIGIN);
  const [radius, setRadius] = useState<Radius>(initialRadiusMiles);
  const [zip, setZip] = useState("");
  const [rows, setRows] = useState<NearbyDispensaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/dispensary/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=${radius}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`request_failed_${res.status}`);
        const data = (await res.json()) as { dispensaries: NearbyDispensaryRow[] };
        if (!cancelled) {
          setRows(data.dispensaries);
          setActiveId(data.dispensaries[0]?.id ?? null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "load_failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [origin, radius]);

  const useCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("geolocation_unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setOrigin({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => setError("geolocation_denied"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const submitZip = async () => {
    const trimmed = zip.trim();
    if (!/^\d{5}$/.test(trimmed)) {
      setError("invalid_zip");
      return;
    }
    setError(null);
    // Production: replace with a real geocoding call. For the scaffold
    // we keep the existing origin and simply re-run with the typed ZIP
    // as a label — the user can still drop a pin via geolocate.
    setOrigin((prev) => ({ ...prev }));
  };

  const activeRow = useMemo(
    () => rows.find((r) => r.id === activeId) ?? rows[0] ?? null,
    [rows, activeId],
  );

  const embedSrc = useMemo(() => {
    if (!apiKey) return null;
    if (activeRow) {
      const q = encodeURIComponent(
        `${activeRow.geo.addressLine1}, ${activeRow.geo.city}, ${activeRow.geo.state} ${activeRow.geo.postalCode}`,
      );
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${q}&zoom=12`;
    }
    return `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${origin.lat},${origin.lng}&zoom=11`;
  }, [apiKey, activeRow, origin.lat, origin.lng]);

  return (
    <div className="space-y-4">
      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-base">Find a dispensary</CardTitle>
          <CardDescription>
            Search within {radius} miles of the patient&rsquo;s location. The
            map updates as you change radius or pick a result.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="ZIP code"
                className="w-28"
              />
              <Button variant="secondary" size="sm" onClick={submitZip}>
                Search
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={useCurrentLocation}>
              Use current location
            </Button>
            <div className="flex items-center gap-1.5 ml-auto">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadius(r)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-full border transition-colors",
                    r === radius
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-surface-raised text-text-muted border-border hover:bg-surface-muted",
                  )}
                >
                  {r} mi
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="mt-3 text-xs text-red-700">
              {error === "invalid_zip"
                ? "Please enter a 5-digit ZIP code."
                : error === "geolocation_denied"
                ? "Location permission was denied."
                : error === "geolocation_unavailable"
                ? "This browser cannot share location."
                : "Could not load nearby dispensaries."}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
        <Card tone="raised" className="overflow-hidden">
          <div className="aspect-[16/10] bg-emerald-50/40 relative">
            {embedSrc ? (
              <iframe
                title="Dispensary map"
                src={embedSrc}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : (
              <MapPlaceholder rows={rows} origin={origin} />
            )}
          </div>
        </Card>

        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {loading && (
            <p className="text-xs text-text-subtle px-2">Searching…</p>
          )}
          {!loading && rows.length === 0 && (
            <p className="text-xs text-text-subtle px-2">
              No dispensaries within {radius} miles.
            </p>
          )}
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setActiveId(row.id)}
              className={cn(
                "w-full text-left rounded-lg border p-3 transition-colors",
                row.id === activeId
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-border bg-surface hover:bg-surface-muted",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm text-text">{row.name}</p>
                <Badge tone="neutral" className="text-[10px]">
                  {row.distanceMiles.toFixed(1)} mi
                </Badge>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                {row.geo.addressLine1}, {row.geo.city}, {row.geo.state}{" "}
                {row.geo.postalCode}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-text-subtle">
                <span>{row.skuCount} SKUs</span>
                {row.geo.hoursLine && <span>{row.geo.hoursLine}</span>}
                {row.geo.phone && <span>{row.geo.phone}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MapPlaceholder({
  rows,
  origin,
}: {
  rows: NearbyDispensaryRow[];
  origin: { lat: number; lng: number };
}) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-[11px] text-amber-800">
        Set <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
        to enable the live map. Showing a placeholder plate.
      </div>
      <div className="flex-1 relative bg-[radial-gradient(circle_at_50%_50%,#dcfce7_0%,#f0fdf4_70%)]">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-2xl">📍</div>
          <p className="text-[11px] text-text-subtle mt-1 font-mono">
            {origin.lat.toFixed(3)}, {origin.lng.toFixed(3)}
          </p>
        </div>
        <ul className="absolute inset-0 p-4 grid grid-cols-2 gap-2 content-start text-[11px] text-text-muted">
          {rows.slice(0, 6).map((r) => (
            <li
              key={r.id}
              className="bg-white/70 rounded-md px-2 py-1 border border-border"
            >
              <span className="font-medium text-text">{r.name}</span>
              <span className="block text-text-subtle">
                {r.distanceMiles.toFixed(1)} mi
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
