"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Compass,
  ExternalLink,
  Leaf,
  Locate,
  MapPin,
  Minus,
  Navigation,
  Phone,
  Plus,
  Star,
  Stethoscope,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LocationKind = "dispensary" | "provider";

export type ProductCategory =
  | "flower"
  | "edibles"
  | "tinctures"
  | "topicals"
  | "vapes"
  | "accessories"
  | "primary-care"
  | "psychiatry"
  | "pain";

export interface LocatorLocation {
  id: string;
  name: string;
  kind: LocationKind;
  lat: number;
  lng: number;
  address: string;
  phone: string;
  rating: number;
  reviews: number;
  hours: string;
  isOpen: boolean;
  distanceMiles: number;
  categories: ProductCategory[];
  specialty?: string;
  pricePoint?: "$" | "$$" | "$$$";
  isPartner?: boolean;
  acceptingNewPatients?: boolean;
}

export interface LocatorOrigin {
  lat: number;
  lng: number;
  label?: string;
}

export interface LocatorFilter {
  kind: "all" | LocationKind;
  maxDistance: number;
  minRating: number;
  category: "all" | ProductCategory;
}

export interface LocatorMapHandle {
  focusLocation: (id: string) => void;
  resetView: () => void;
}

export interface LocatorMapProps {
  locations?: LocatorLocation[];
  origin?: LocatorOrigin;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  filter?: LocatorFilter;
  onFilterChange?: (next: LocatorFilter) => void;
  className?: string;
  /** Reserve room for a footer caption rendered by the parent (server hint). */
  height?: number;
}

// ---------------------------------------------------------------------------
// Defaults — a curated, warm apothecary demo set
// ---------------------------------------------------------------------------

const DEFAULT_ORIGIN: LocatorOrigin = {
  lat: 37.7749,
  lng: -122.4194,
  label: "Your home",
};

const MILES_PER_DEG_LAT = 69;

function milesPerDegLng(lat: number) {
  return MILES_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

function withDistance(
  base: Omit<LocatorLocation, "distanceMiles">,
  origin: LocatorOrigin,
): LocatorLocation {
  const dLatMi = (base.lat - origin.lat) * MILES_PER_DEG_LAT;
  const dLngMi = (base.lng - origin.lng) * milesPerDegLng(origin.lat);
  const distanceMiles = Math.sqrt(dLatMi * dLatMi + dLngMi * dLngMi);
  return { ...base, distanceMiles };
}

function buildDefaultLocations(origin: LocatorOrigin): LocatorLocation[] {
  const seeds: Array<Omit<LocatorLocation, "distanceMiles">> = [
    {
      id: "verdant-downtown",
      name: "Verdant Apothecary — Downtown",
      kind: "dispensary",
      lat: origin.lat + 0.006,
      lng: origin.lng + 0.004,
      address: "123 Main St · Suite 4",
      phone: "(415) 555-0142",
      hours: "Open · closes 9:00 PM",
      isOpen: true,
      rating: 4.8,
      reviews: 482,
      categories: ["flower", "tinctures", "edibles", "topicals"],
      pricePoint: "$$",
      isPartner: true,
    },
    {
      id: "green-horizon",
      name: "Green Horizon Wellness",
      kind: "dispensary",
      lat: origin.lat + 0.015,
      lng: origin.lng - 0.014,
      address: "456 Pearl District",
      phone: "(415) 555-0188",
      hours: "Open · closes 10:00 PM",
      isOpen: true,
      rating: 4.6,
      reviews: 312,
      categories: ["flower", "edibles", "vapes", "accessories"],
      pricePoint: "$",
    },
    {
      id: "amber-leaf",
      name: "Amber Leaf Collective",
      kind: "dispensary",
      lat: origin.lat - 0.011,
      lng: origin.lng + 0.018,
      address: "78 Cedar Lane",
      phone: "(415) 555-0166",
      hours: "Closed · opens 10:00 AM",
      isOpen: false,
      rating: 4.4,
      reviews: 198,
      categories: ["tinctures", "topicals", "edibles"],
      pricePoint: "$$$",
      isPartner: true,
    },
    {
      id: "harvest-hill",
      name: "Harvest Hill Botanicals",
      kind: "dispensary",
      lat: origin.lat - 0.022,
      lng: origin.lng - 0.009,
      address: "910 Orchard Way",
      phone: "(415) 555-0119",
      hours: "Open · closes 8:00 PM",
      isOpen: true,
      rating: 4.7,
      reviews: 567,
      categories: ["flower", "vapes", "accessories"],
      pricePoint: "$$",
    },
    {
      id: "moss-bay",
      name: "Moss & Bay Provisions",
      kind: "dispensary",
      lat: origin.lat + 0.028,
      lng: origin.lng + 0.023,
      address: "2200 Bayview Pkwy",
      phone: "(415) 555-0153",
      hours: "Open · closes 11:00 PM",
      isOpen: true,
      rating: 4.5,
      reviews: 244,
      categories: ["flower", "edibles", "tinctures", "topicals", "vapes"],
      pricePoint: "$$",
    },
    {
      id: "stillpoint-clinic",
      name: "Dr. Naomi Patel · Stillpoint Clinic",
      kind: "provider",
      lat: origin.lat + 0.004,
      lng: origin.lng - 0.007,
      address: "55 Mission Square · Floor 3",
      phone: "(415) 555-0200",
      hours: "Open · closes 6:00 PM",
      isOpen: true,
      rating: 4.9,
      reviews: 88,
      categories: ["primary-care", "pain"],
      specialty: "Cannabis Medicine · Internal",
      acceptingNewPatients: true,
      isPartner: true,
    },
    {
      id: "groves-psych",
      name: "Dr. Marcus Groves · Cannabis Psychiatry",
      kind: "provider",
      lat: origin.lat - 0.013,
      lng: origin.lng + 0.005,
      address: "210 Elm St · Suite B",
      phone: "(415) 555-0212",
      hours: "Open · closes 5:00 PM",
      isOpen: true,
      rating: 4.7,
      reviews: 64,
      categories: ["psychiatry"],
      specialty: "Psychiatry · PTSD & Anxiety",
      acceptingNewPatients: true,
    },
    {
      id: "ridge-pain",
      name: "Ridgeline Cannabis Pain Center",
      kind: "provider",
      lat: origin.lat + 0.019,
      lng: origin.lng - 0.022,
      address: "1180 Ridge Crest",
      phone: "(415) 555-0224",
      hours: "Closed · opens 8:00 AM",
      isOpen: false,
      rating: 4.6,
      reviews: 142,
      categories: ["pain", "primary-care"],
      specialty: "Pain Management",
      acceptingNewPatients: false,
    },
    {
      id: "willow-family",
      name: "Willow Family Wellness",
      kind: "provider",
      lat: origin.lat - 0.005,
      lng: origin.lng + 0.026,
      address: "640 Willow Ave",
      phone: "(415) 555-0236",
      hours: "Open · closes 7:00 PM",
      isOpen: true,
      rating: 4.5,
      reviews: 71,
      categories: ["primary-care"],
      specialty: "Family Medicine · Cannabis-Certified",
      acceptingNewPatients: true,
      isPartner: true,
    },
  ];
  return seeds.map((s) => withDistance(s, origin));
}

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

export const DEFAULT_FILTER: LocatorFilter = {
  kind: "all",
  maxDistance: 25,
  minRating: 0,
  category: "all",
};

export function applyFilter(
  locations: LocatorLocation[],
  filter: LocatorFilter,
): LocatorLocation[] {
  return locations
    .filter((l) => (filter.kind === "all" ? true : l.kind === filter.kind))
    .filter((l) => l.distanceMiles <= filter.maxDistance)
    .filter((l) => l.rating >= filter.minRating)
    .filter((l) =>
      filter.category === "all" ? true : l.categories.includes(filter.category),
    )
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

const SVG_UNITS_PER_MILE = 50; // at zoom = 1, 1000 units across covers 20 miles

function projectToSvg(
  loc: { lat: number; lng: number },
  origin: LocatorOrigin,
): { x: number; y: number } {
  const dLngMi = (loc.lng - origin.lng) * milesPerDegLng(origin.lat);
  const dLatMi = (loc.lat - origin.lat) * MILES_PER_DEG_LAT;
  return {
    x: 500 + dLngMi * SVG_UNITS_PER_MILE,
    y: 500 - dLatMi * SVG_UNITS_PER_MILE,
  };
}

// ---------------------------------------------------------------------------
// Visual atoms
// ---------------------------------------------------------------------------

function StarRating({
  rating,
  reviews,
  size = "sm",
}: {
  rating: number;
  reviews?: number;
  size?: "xs" | "sm";
}) {
  const px = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-1 text-text-muted">
      <Star className={cn(px, "fill-amber-400 stroke-amber-500")} />
      <span className="font-medium text-text">{rating.toFixed(1)}</span>
      {typeof reviews === "number" && (
        <span className="text-text-subtle">({reviews})</span>
      )}
    </span>
  );
}

function CategoryDot({ kind }: { kind: LocationKind }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        kind === "dispensary" ? "bg-accent" : "bg-[color:var(--highlight)]",
      )}
    />
  );
}

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  flower: "Flower",
  edibles: "Edibles",
  tinctures: "Tinctures",
  topicals: "Topicals",
  vapes: "Vapes",
  accessories: "Accessories",
  "primary-care": "Primary Care",
  psychiatry: "Psychiatry",
  pain: "Pain Mgmt",
};

const CATEGORY_OPTIONS: Array<{ value: "all" | ProductCategory; label: string }> = [
  { value: "all", label: "All categories" },
  { value: "flower", label: CATEGORY_LABEL.flower },
  { value: "edibles", label: CATEGORY_LABEL.edibles },
  { value: "tinctures", label: CATEGORY_LABEL.tinctures },
  { value: "topicals", label: CATEGORY_LABEL.topicals },
  { value: "vapes", label: CATEGORY_LABEL.vapes },
  { value: "primary-care", label: CATEGORY_LABEL["primary-care"] },
  { value: "psychiatry", label: CATEGORY_LABEL.psychiatry },
  { value: "pain", label: CATEGORY_LABEL.pain },
];

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

function FilterBar({
  filter,
  onChange,
  counts,
}: {
  filter: LocatorFilter;
  onChange: (next: LocatorFilter) => void;
  counts: { all: number; dispensary: number; provider: number };
}) {
  const kinds: Array<{ value: LocatorFilter["kind"]; label: string; count: number }> = [
    { value: "all", label: "All", count: counts.all },
    { value: "dispensary", label: "Dispensaries", count: counts.dispensary },
    { value: "provider", label: "Providers", count: counts.provider },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-surface/60">
      <div
        role="tablist"
        aria-label="Filter by location kind"
        className="inline-flex rounded-full bg-surface-muted/80 p-0.5 border border-border"
      >
        {kinds.map((k) => {
          const active = filter.kind === k.value;
          return (
            <button
              key={k.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange({ ...filter, kind: k.value })}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-[12px] font-medium",
                "transition-colors duration-200 ease-smooth",
                active
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-muted hover:text-text",
              )}
            >
              {k.label}
              <span
                className={cn(
                  "tabular-nums text-[10px] rounded-full px-1.5 py-px",
                  active ? "bg-accent/10 text-accent" : "bg-surface/70 text-text-subtle",
                )}
              >
                {k.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <label className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
          Distance
        </label>
        <select
          aria-label="Maximum distance"
          value={filter.maxDistance}
          onChange={(e) =>
            onChange({ ...filter, maxDistance: Number(e.target.value) })
          }
          className="h-7 rounded-full border border-border bg-surface px-3 text-[12px] text-text focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value={5}>≤ 5 mi</option>
          <option value={10}>≤ 10 mi</option>
          <option value={25}>≤ 25 mi</option>
          <option value={50}>≤ 50 mi</option>
        </select>

        <label className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
          Rating
        </label>
        <select
          aria-label="Minimum rating"
          value={filter.minRating}
          onChange={(e) =>
            onChange({ ...filter, minRating: Number(e.target.value) })
          }
          className="h-7 rounded-full border border-border bg-surface px-3 text-[12px] text-text focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value={0}>Any</option>
          <option value={3.5}>3.5+</option>
          <option value={4}>4.0+</option>
          <option value={4.5}>4.5+</option>
        </select>

        <label className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
          Category
        </label>
        <select
          aria-label="Category"
          value={filter.category}
          onChange={(e) =>
            onChange({
              ...filter,
              category: e.target.value as LocatorFilter["category"],
            })
          }
          className="h-7 rounded-full border border-border bg-surface px-3 text-[12px] text-text focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Simulated apothecary map background (pure SVG)
// ---------------------------------------------------------------------------

function MapBackdrop() {
  return (
    <g aria-hidden>
      <defs>
        <radialGradient id="lj-parchment" cx="50%" cy="42%" r="72%">
          <stop offset="0%" stopColor="#FBF4E4" />
          <stop offset="55%" stopColor="#F2E7CB" />
          <stop offset="100%" stopColor="#E1D2A6" />
        </radialGradient>
        <linearGradient id="lj-river" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#BBD3D2" />
          <stop offset="100%" stopColor="#8FB6B4" />
        </linearGradient>
        <pattern
          id="lj-hatch"
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(28)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="14"
            stroke="#8E6F3A"
            strokeWidth="0.5"
            opacity="0.10"
          />
        </pattern>
      </defs>

      <rect x="0" y="0" width="1000" height="1000" fill="url(#lj-parchment)" />
      <rect x="0" y="0" width="1000" height="1000" fill="url(#lj-hatch)" />

      <g stroke="#8E6F3A" strokeWidth="0.55" opacity="0.18">
        {Array.from({ length: 21 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="1000" />
        ))}
        {Array.from({ length: 21 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 50} x2="1000" y2={i * 50} />
        ))}
      </g>

      <g stroke="#8E6F3A" strokeWidth="1.6" opacity="0.30" fill="none">
        <line x1="0" y1="500" x2="1000" y2="500" />
        <line x1="500" y1="0" x2="500" y2="1000" />
        <line x1="0" y1="0" x2="1000" y2="1000" opacity="0.15" />
        <line x1="1000" y1="0" x2="0" y2="1000" opacity="0.15" />
      </g>

      <path
        d="M -40 720 C 200 700, 320 820, 540 780 S 880 700, 1080 760 L 1080 1040 L -40 1040 Z"
        fill="url(#lj-river)"
        opacity="0.55"
      />
      <path
        d="M -40 720 C 200 700, 320 820, 540 780 S 880 700, 1080 760"
        fill="none"
        stroke="#6F9594"
        strokeWidth="1"
        opacity="0.4"
      />

      <g opacity="0.7">
        <ellipse cx="760" cy="240" rx="120" ry="80" fill="#C5D5A8" opacity="0.7" />
        <ellipse cx="190" cy="300" rx="90" ry="70" fill="#C5D5A8" opacity="0.6" />
        <ellipse cx="290" cy="640" rx="70" ry="50" fill="#C5D5A8" opacity="0.55" />
      </g>

      <g
        fontFamily="var(--font-display), Georgia, serif"
        fill="#8E6F3A"
        opacity="0.4"
        fontStyle="italic"
      >
        <text x="760" y="245" fontSize="18" textAnchor="middle">
          Eastfield Park
        </text>
        <text x="190" y="305" fontSize="16" textAnchor="middle">
          Cedar Grove
        </text>
        <text x="290" y="645" fontSize="14" textAnchor="middle">
          Riverside
        </text>
        <text x="540" y="830" fontSize="14" textAnchor="middle">
          Mariners Bay
        </text>
      </g>

      <g opacity="0.18" stroke="#8E6F3A" strokeWidth="1.2" fill="none">
        <path d="M 80 80 Q 320 200, 540 180 T 920 200" />
        <path d="M 60 420 Q 280 400, 500 460 T 940 440" />
        <path d="M 100 920 Q 360 880, 540 920 T 940 880" />
        <path d="M 120 60 Q 200 320, 240 580 T 280 940" />
        <path d="M 720 40 Q 700 280, 780 540 T 820 940" />
      </g>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const LocatorMap = React.forwardRef<LocatorMapHandle, LocatorMapProps>(
  function LocatorMap(
    {
      locations,
      origin = DEFAULT_ORIGIN,
      selectedId: selectedIdProp,
      onSelect,
      filter: filterProp,
      onFilterChange,
      className,
      height,
    },
    ref,
  ) {
    const reduceMotion = useReducedMotion() ?? false;

    const allLocations = React.useMemo<LocatorLocation[]>(
      () => (locations && locations.length > 0 ? locations : buildDefaultLocations(origin)),
      [locations, origin],
    );

    // Filter state — controlled if `filterProp` is provided.
    const [internalFilter, setInternalFilter] = React.useState<LocatorFilter>(
      filterProp ?? DEFAULT_FILTER,
    );
    const filter = filterProp ?? internalFilter;
    const setFilter = React.useCallback(
      (next: LocatorFilter) => {
        if (onFilterChange) onFilterChange(next);
        else setInternalFilter(next);
      },
      [onFilterChange],
    );

    // Selection state — controlled if `selectedIdProp !== undefined`.
    const [internalSelectedId, setInternalSelectedId] = React.useState<string | null>(
      null,
    );
    const selectedId = selectedIdProp !== undefined ? selectedIdProp : internalSelectedId;
    const setSelectedId = React.useCallback(
      (next: string | null) => {
        if (onSelect) onSelect(next);
        if (selectedIdProp === undefined) setInternalSelectedId(next);
      },
      [onSelect, selectedIdProp],
    );

    const visible = React.useMemo(() => applyFilter(allLocations, filter), [
      allLocations,
      filter,
    ]);

    const counts = React.useMemo(() => {
      const passKindAgnostic = allLocations
        .filter((l) => l.distanceMiles <= filter.maxDistance)
        .filter((l) => l.rating >= filter.minRating)
        .filter((l) =>
          filter.category === "all" ? true : l.categories.includes(filter.category),
        );
      return {
        all: passKindAgnostic.length,
        dispensary: passKindAgnostic.filter((l) => l.kind === "dispensary").length,
        provider: passKindAgnostic.filter((l) => l.kind === "provider").length,
      };
    }, [allLocations, filter]);

    // Map view state.
    const [view, setView] = React.useState<{ cx: number; cy: number; zoom: number }>({
      cx: 500,
      cy: 500,
      zoom: 1,
    });

    // Container measurement.
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [size, setSize] = React.useState({ w: 800, h: 560 });
    React.useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          setSize({ w: cr.width, h: cr.height });
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    const scale = Math.max(size.w, size.h) / 1000;

    const project = React.useCallback(
      (loc: { lat: number; lng: number }) => {
        const svg = projectToSvg(loc, origin);
        const screenX = (svg.x - view.cx) * view.zoom * scale + size.w / 2;
        const screenY = (svg.y - view.cy) * view.zoom * scale + size.h / 2;
        return { svg, screenX, screenY };
      },
      [origin, scale, size.h, size.w, view.cx, view.cy, view.zoom],
    );

    const originScreen = React.useMemo(() => project(origin), [origin, project]);

    // Imperative handle.
    React.useImperativeHandle(
      ref,
      () => ({
        focusLocation: (id: string) => {
          const loc = allLocations.find((l) => l.id === id);
          if (!loc) return;
          const svg = projectToSvg(loc, origin);
          setView((v) => ({
            cx: svg.x,
            cy: svg.y,
            zoom: Math.max(v.zoom, 2.2),
          }));
          setSelectedId(id);
        },
        resetView: () => setView({ cx: 500, cy: 500, zoom: 1 }),
      }),
      [allLocations, origin, setSelectedId],
    );

    // When `selectedId` changes from outside (or from a pin click) and the
    // pin would be outside the viewport, gently pan toward it.
    const lastFocusedRef = React.useRef<string | null>(null);
    React.useEffect(() => {
      if (!selectedId || lastFocusedRef.current === selectedId) return;
      const loc = allLocations.find((l) => l.id === selectedId);
      if (!loc) return;
      const svg = projectToSvg(loc, origin);
      setView((v) => ({
        cx: svg.x,
        cy: svg.y,
        zoom: Math.max(v.zoom, 1.8),
      }));
      lastFocusedRef.current = selectedId;
    }, [allLocations, origin, selectedId]);

    // Drag-to-pan.
    const dragState = React.useRef<{
      pointerId: number;
      startX: number;
      startY: number;
      startCx: number;
      startCy: number;
      moved: boolean;
    } | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);

    function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
      // Only pan when the gesture starts on the map surface, not on a pin/control.
      const target = e.target as HTMLElement;
      if (target.closest("[data-locator-pin]") || target.closest("[data-locator-ui]"))
        return;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      dragState.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startCx: view.cx,
        startCy: view.cy,
        moved: false,
      };
      setIsDragging(true);
    }

    function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
      const ds = dragState.current;
      if (!ds || ds.pointerId !== e.pointerId) return;
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) ds.moved = true;
      const denom = view.zoom * scale;
      if (denom === 0) return;
      setView((v) => ({
        ...v,
        cx: clamp(ds.startCx - dx / denom, -500, 1500),
        cy: clamp(ds.startCy - dy / denom, -500, 1500),
      }));
    }

    function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
      const ds = dragState.current;
      if (!ds) return;
      try {
        (e.currentTarget as Element).releasePointerCapture(ds.pointerId);
      } catch {
        /* releasing a pointer we never captured is fine */
      }
      dragState.current = null;
      setIsDragging(false);
    }

    function zoomBy(delta: number) {
      setView((v) => ({
        ...v,
        zoom: clamp(Number((v.zoom * (1 + delta)).toFixed(3)), 0.6, 4.5),
      }));
    }

    function resetView() {
      setView({ cx: 500, cy: 500, zoom: 1 });
    }

    function onWheel(e: React.WheelEvent<HTMLDivElement>) {
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 0.12 : -0.12);
    }

    // Escape closes popover.
    React.useEffect(() => {
      function onKey(ev: KeyboardEvent) {
        if (ev.key === "Escape" && selectedId) setSelectedId(null);
      }
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [selectedId, setSelectedId]);

    const selectedLocation = selectedId
      ? allLocations.find((l) => l.id === selectedId) ?? null
      : null;

    const transformOrigin = `${size.w / 2}px ${size.h / 2}px`;

    return (
      <div
        className={cn(
          "rounded-2xl border border-border bg-surface shadow-md overflow-hidden",
          "flex flex-col",
          className,
        )}
      >
        <FilterBar filter={filter} onChange={setFilter} counts={counts} />

        <div
          ref={containerRef}
          className={cn(
            "relative w-full select-none",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
          style={{ height: height ?? 520 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          role="application"
          aria-label="Dispensary and provider locator map"
        >
          <svg
            viewBox="0 0 1000 1000"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 h-full w-full"
            style={{
              transform: `translate(${(500 - view.cx) * view.zoom * scale}px, ${
                (500 - view.cy) * view.zoom * scale
              }px) scale(${view.zoom})`,
              transformOrigin,
              transition: isDragging || reduceMotion ? "none" : "transform 450ms cubic-bezier(0.22, 0.61, 0.36, 1)",
            }}
          >
            <MapBackdrop />
          </svg>

          {/* Radial distance rings around origin */}
          <DistanceRings
            originScreenX={originScreen.screenX}
            originScreenY={originScreen.screenY}
            milePx={SVG_UNITS_PER_MILE * view.zoom * scale}
          />

          {/* Origin "you are here" pin */}
          <OriginPin
            screenX={originScreen.screenX}
            screenY={originScreen.screenY}
            label={origin.label ?? "You"}
          />

          {/* Location pins */}
          {visible.map((loc) => {
            const p = project(loc);
            const isSelected = loc.id === selectedId;
            return (
              <LocationPin
                key={loc.id}
                loc={loc}
                screenX={p.screenX}
                screenY={p.screenY}
                selected={isSelected}
                onClick={() => {
                  // If the user just finished a drag, swallow the click.
                  if (dragState.current?.moved) return;
                  setSelectedId(isSelected ? null : loc.id);
                }}
              />
            );
          })}

          {/* Popover for selected location */}
          <AnimatePresence>
            {selectedLocation
              ? (() => {
                  const p = project(selectedLocation);
                  return (
                    <LocationPopover
                      key={selectedLocation.id}
                      loc={selectedLocation}
                      origin={origin}
                      screenX={p.screenX}
                      screenY={p.screenY}
                      containerW={size.w}
                      containerH={size.h}
                      reduceMotion={reduceMotion}
                      onClose={() => setSelectedId(null)}
                    />
                  );
                })()
              : null}
          </AnimatePresence>

          {/* Map controls */}
          <div
            data-locator-ui
            className="absolute right-3 top-3 flex flex-col gap-2"
          >
            <button
              type="button"
              onClick={() => zoomBy(0.2)}
              aria-label="Zoom in"
              className="h-9 w-9 rounded-full bg-surface/90 backdrop-blur border border-border shadow-sm grid place-items-center text-text hover:bg-surface transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => zoomBy(-0.18)}
              aria-label="Zoom out"
              className="h-9 w-9 rounded-full bg-surface/90 backdrop-blur border border-border shadow-sm grid place-items-center text-text hover:bg-surface transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={resetView}
              aria-label="Reset view"
              className="h-9 w-9 rounded-full bg-surface/90 backdrop-blur border border-border shadow-sm grid place-items-center text-text-muted hover:text-text hover:bg-surface transition-colors"
            >
              <Locate className="h-4 w-4" />
            </button>
          </div>

          {/* Legend + compass */}
          <div
            data-locator-ui
            className="absolute left-3 bottom-3 flex items-center gap-2"
          >
            <div className="liquid-glass rounded-xl px-3 py-2 text-[11px] text-text-muted flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Dispensary
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[color:var(--highlight)]" />
                Provider
              </span>
            </div>
            <div className="liquid-glass rounded-full h-9 w-9 grid place-items-center text-text-muted">
              <Compass className="h-4 w-4" aria-hidden />
            </div>
          </div>

          {/* Scale bar */}
          <div
            data-locator-ui
            className="absolute right-3 bottom-3 liquid-glass rounded-lg px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] text-text-muted flex items-center gap-2"
          >
            <span
              className="block h-[3px] rounded-full bg-text-muted/70"
              style={{
                width: `${Math.max(36, Math.min(120, SVG_UNITS_PER_MILE * view.zoom * scale))}px`,
              }}
            />
            <span className="font-medium text-text">1 mi</span>
          </div>

          {visible.length === 0 ? (
            <div
              data-locator-ui
              className="absolute inset-0 grid place-items-center pointer-events-none"
            >
              <div className="bg-surface/90 backdrop-blur border border-border shadow-md rounded-xl px-5 py-4 text-center max-w-[260px] pointer-events-auto">
                <Leaf className="h-5 w-5 mx-auto text-accent mb-1.5" />
                <p className="text-sm text-text font-medium">
                  No locations match your filters
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Try widening the distance or relaxing the rating threshold.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);

// ---------------------------------------------------------------------------
// Distance rings
// ---------------------------------------------------------------------------

function DistanceRings({
  originScreenX,
  originScreenY,
  milePx,
}: {
  originScreenX: number;
  originScreenY: number;
  milePx: number;
}) {
  if (milePx < 6) return null;
  const rings = [1, 3, 5, 10].filter((m) => m * milePx < 1400);
  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none"
      aria-hidden
    >
      {rings.map((m) => (
        <circle
          key={m}
          cx={originScreenX}
          cy={originScreenY}
          r={m * milePx}
          fill="none"
          stroke="#8E6F3A"
          strokeOpacity="0.18"
          strokeDasharray="4 6"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Origin pin (patient home)
// ---------------------------------------------------------------------------

function OriginPin({
  screenX,
  screenY,
  label,
}: {
  screenX: number;
  screenY: number;
  label: string;
}) {
  return (
    <div
      data-locator-ui
      className="absolute pointer-events-none"
      style={{ left: screenX, top: screenY, transform: "translate(-50%, -50%)" }}
    >
      <div className="relative">
        <span className="absolute inset-0 -m-1 rounded-full bg-accent/20 animate-ping" />
        <span className="relative block h-3.5 w-3.5 rounded-full bg-accent border-2 border-surface shadow-md" />
      </div>
      <div className="mt-1 px-2 py-0.5 rounded-full bg-surface/90 backdrop-blur border border-border text-[10px] font-medium text-text whitespace-nowrap shadow-sm">
        {label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Location pin
// ---------------------------------------------------------------------------

function LocationPin({
  loc,
  screenX,
  screenY,
  selected,
  onClick,
}: {
  loc: LocatorLocation;
  screenX: number;
  screenY: number;
  selected: boolean;
  onClick: () => void;
}) {
  const isDisp = loc.kind === "dispensary";
  return (
    <button
      type="button"
      data-locator-pin
      onClick={onClick}
      aria-label={`${loc.name} — ${loc.rating.toFixed(1)} stars, ${loc.distanceMiles.toFixed(1)} miles`}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-full focus:outline-none",
        "transition-transform duration-200 ease-smooth",
        "hover:-translate-y-[110%]",
      )}
      style={{
        left: screenX,
        top: screenY,
        zIndex: selected ? 30 : loc.isPartner ? 20 : 10,
      }}
    >
      <div
        className={cn(
          "relative grid place-items-center h-9 w-9 rounded-full shadow-md",
          "border-2 transition-all duration-200 ease-smooth",
          selected
            ? "scale-110 ring-4 ring-offset-1 ring-offset-surface"
            : "hover:scale-105",
          isDisp
            ? "bg-accent text-accent-ink border-surface"
            : "bg-[color:var(--highlight)] text-white border-surface",
          selected
            ? isDisp
              ? "ring-accent/30"
              : "ring-[color:var(--highlight)]/30"
            : "",
        )}
      >
        {isDisp ? (
          <Leaf className="h-4 w-4" />
        ) : (
          <Stethoscope className="h-4 w-4" />
        )}
        {loc.isPartner ? (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-400 border-2 border-surface"
          />
        ) : null}
      </div>
      <div
        aria-hidden
        className={cn(
          "mx-auto h-2 w-2 -mt-[5px] rotate-45 border-r-2 border-b-2 border-surface",
          isDisp ? "bg-accent" : "bg-[color:var(--highlight)]",
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Popover — rich info card anchored to a pin
// ---------------------------------------------------------------------------

function LocationPopover({
  loc,
  origin,
  screenX,
  screenY,
  containerW,
  containerH,
  reduceMotion,
  onClose,
}: {
  loc: LocatorLocation;
  origin: LocatorOrigin;
  screenX: number;
  screenY: number;
  containerW: number;
  containerH: number;
  reduceMotion: boolean;
  onClose: () => void;
}) {
  const cardW = 296;
  const cardH = 256;
  const gap = 14;

  // Default: above the pin. Flip below if too close to the top edge.
  const placeBelow = screenY - cardH - gap < 8;
  const cardTop = placeBelow ? screenY + gap : screenY - cardH - gap;
  // Center horizontally on the pin, clamped to container.
  const cardLeft = clamp(screenX - cardW / 2, 8, Math.max(8, containerW - cardW - 8));
  const arrowOffset = clamp(screenX - cardLeft, 16, cardW - 16);

  const dirHref = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${loc.lat},${loc.lng}`;

  return (
    <motion.div
      data-locator-ui
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: placeBelow ? -6 : 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: placeBelow ? -4 : 4, scale: 0.97 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 0.61, 0.36, 1] }}
      className="absolute"
      style={{
        left: cardLeft,
        top: Math.max(8, Math.min(cardTop, containerH - cardH - 8)),
        width: cardW,
        zIndex: 40,
      }}
      role="dialog"
      aria-label={`${loc.name} details`}
    >
      <div className="relative rounded-2xl bg-surface border border-border shadow-lg overflow-hidden">
        {/* Caret */}
        <span
          aria-hidden
          className="absolute h-3 w-3 rotate-45 bg-surface border border-border"
          style={{
            left: arrowOffset - 6,
            ...(placeBelow
              ? { top: -7, borderRight: "none", borderBottom: "none" }
              : { bottom: -7, borderLeft: "none", borderTop: "none" }),
          }}
        />

        <div className="px-4 pt-3.5 pb-3 border-b border-border bg-gradient-to-b from-accent-soft/40 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CategoryDot kind={loc.kind} />
                <span className="text-[11px] uppercase tracking-[0.14em] text-text-muted font-medium">
                  {loc.kind === "dispensary" ? "Dispensary" : "Provider"}
                </span>
                {loc.isPartner ? (
                  <span className="text-[10px] uppercase tracking-[0.14em] text-accent font-semibold">
                    · Partner
                  </span>
                ) : null}
              </div>
              <h3 className="font-display text-[17px] text-text leading-snug mt-0.5 truncate">
                {loc.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="shrink-0 -mr-1 -mt-1 h-7 w-7 rounded-full text-text-muted hover:text-text hover:bg-surface-muted transition-colors grid place-items-center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            <StarRating rating={loc.rating} reviews={loc.reviews} />
            <span className="inline-flex items-center gap-1 text-text-muted">
              <MapPin className="h-3 w-3" />
              <span className="font-medium text-text">
                {loc.distanceMiles.toFixed(1)} mi
              </span>
              away
            </span>
            {loc.pricePoint ? (
              <span className="text-text-muted">
                <span className="font-medium text-text">{loc.pricePoint}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="px-4 py-3 space-y-2 text-[13px]">
          <div className="flex items-start gap-2 text-text-muted">
            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-text-subtle" />
            <span className="text-text">{loc.address}</span>
          </div>
          <div className="flex items-center gap-2 text-text-muted">
            <Phone className="h-3.5 w-3.5 shrink-0 text-text-subtle" />
            <a
              href={`tel:${loc.phone.replace(/[^0-9+]/g, "")}`}
              className="text-text hover:text-accent transition-colors"
            >
              {loc.phone}
            </a>
            <span
              className={cn(
                "ml-auto text-[11px] font-medium",
                loc.isOpen ? "text-success" : "text-text-subtle",
              )}
            >
              {loc.hours}
            </span>
          </div>
          {loc.specialty ? (
            <div className="text-[12px] text-text-muted">
              <span className="font-medium text-text">Specialty · </span>
              {loc.specialty}
              {loc.acceptingNewPatients ? (
                <span className="ml-1 text-accent">· Accepting new patients</span>
              ) : null}
            </div>
          ) : null}
          {loc.categories.length > 0 ? (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {loc.categories.slice(0, 4).map((c) => (
                <span
                  key={c}
                  className="text-[10px] uppercase tracking-[0.10em] font-medium px-1.5 py-0.5 rounded-full bg-surface-muted text-text-muted border border-border"
                >
                  {CATEGORY_LABEL[c]}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="px-4 pb-3.5 pt-1 flex items-center gap-2">
          <a
            href={dirHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 h-9 rounded-md",
              "bg-gradient-to-b from-accent to-accent-strong text-accent-ink shadow-seal",
              "text-[13px] font-medium",
              "hover:brightness-105 hover:-translate-y-px transition-all duration-200 ease-smooth",
            )}
          >
            <Navigation className="h-3.5 w-3.5" />
            Directions
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
          <a
            href={`tel:${loc.phone.replace(/[^0-9+]/g, "")}`}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md",
              "bg-surface-muted text-text border border-border",
              "text-[13px] font-medium hover:bg-surface transition-colors",
            )}
          >
            <Phone className="h-3.5 w-3.5" />
            Call
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export { buildDefaultLocations };
