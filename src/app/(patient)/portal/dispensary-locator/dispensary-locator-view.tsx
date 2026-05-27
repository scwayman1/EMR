"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Leaf,
  MapPin,
  Navigation,
  Phone,
  Search,
  Star,
  Stethoscope,
} from "lucide-react";

import {
  applyFilter,
  buildDefaultLocations,
  DEFAULT_FILTER,
  LocatorMap,
  type LocatorFilter,
  type LocatorLocation,
  type LocatorMapHandle,
  type LocatorOrigin,
} from "@/components/dispensary/locator-map";
import { cn } from "@/lib/utils/cn";

interface DispensaryLocatorViewProps {
  origin: LocatorOrigin;
  locations?: LocatorLocation[];
}

export function DispensaryLocatorView({
  origin,
  locations,
}: DispensaryLocatorViewProps) {
  const reduceMotion = useReducedMotion() ?? false;

  const allLocations = React.useMemo<LocatorLocation[]>(
    () => (locations && locations.length > 0 ? locations : buildDefaultLocations(origin)),
    [locations, origin],
  );

  const [filter, setFilter] = React.useState<LocatorFilter>(DEFAULT_FILTER);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  const mapRef = React.useRef<LocatorMapHandle | null>(null);

  const visible = React.useMemo(() => {
    const filtered = applyFilter(allLocations, filter);
    const q = query.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        l.specialty?.toLowerCase().includes(q),
    );
  }, [allLocations, filter, query]);

  const focus = React.useCallback((id: string) => {
    setSelectedId(id);
    mapRef.current?.focusLocation(id);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,360px)_1fr] gap-6">
      {/* Side list */}
      <aside className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden flex flex-col min-h-[520px]">
        <div className="px-4 py-3 border-b border-border bg-surface/70">
          <label htmlFor="locator-search" className="sr-only">
            Search dispensaries and providers
          </label>
          <div className="relative">
            <Search
              aria-hidden
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-subtle"
            />
            <input
              id="locator-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, street, or specialty"
              className={cn(
                "w-full h-9 pl-8 pr-3 rounded-full bg-surface-muted/70 border border-border text-[13px]",
                "placeholder:text-text-subtle text-text",
                "focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40",
                "transition-colors",
              )}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted">
            <span className="uppercase tracking-[0.14em] font-medium">
              {visible.length} {visible.length === 1 ? "match" : "matches"}
            </span>
            {filter.kind !== "all" || filter.minRating > 0 || filter.maxDistance < 50 ? (
              <button
                type="button"
                onClick={() => {
                  setFilter(DEFAULT_FILTER);
                  setQuery("");
                }}
                className="text-accent hover:underline"
              >
                Reset filters
              </button>
            ) : null}
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto divide-y divide-border">
          {visible.length === 0 ? (
            <li className="px-4 py-10 text-center text-text-muted text-sm">
              <Leaf className="h-5 w-5 mx-auto text-accent mb-2" />
              No matches. Try widening the radius or clearing the search.
            </li>
          ) : null}
          {visible.map((loc) => {
            const isActive = loc.id === selectedId;
            return (
              <li key={loc.id}>
                <ListRow
                  loc={loc}
                  active={isActive}
                  reduceMotion={reduceMotion}
                  onSelect={() => focus(loc.id)}
                />
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Map */}
      <div className="min-h-[520px]">
        <LocatorMap
          ref={mapRef}
          locations={allLocations}
          origin={origin}
          filter={filter}
          onFilterChange={setFilter}
          selectedId={selectedId}
          onSelect={setSelectedId}
          height={600}
        />
      </div>
    </div>
  );
}

function ListRow({
  loc,
  active,
  reduceMotion,
  onSelect,
}: {
  loc: LocatorLocation;
  active: boolean;
  reduceMotion: boolean;
  onSelect: () => void;
}) {
  const isDisp = loc.kind === "dispensary";
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={reduceMotion ? undefined : { backgroundColor: "rgba(0,0,0,0.02)" }}
      transition={{ duration: 0.15 }}
      className={cn(
        "w-full text-left px-4 py-3 grid grid-cols-[auto_1fr_auto] gap-3 items-start",
        "focus:outline-none focus-visible:bg-accent-soft/60 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/30",
        active ? "bg-accent-soft/60" : "bg-transparent hover:bg-surface-muted/60",
        "transition-colors",
      )}
      aria-pressed={active}
    >
      <span
        className={cn(
          "mt-0.5 grid place-items-center h-8 w-8 rounded-full shrink-0",
          isDisp
            ? "bg-accent-soft text-accent border border-accent/20"
            : "bg-highlight-soft text-[color:var(--highlight-hover)] border border-highlight/25",
        )}
        aria-hidden
      >
        {isDisp ? <Leaf className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />}
      </span>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-[14px] text-text truncate">{loc.name}</h3>
          {loc.isPartner ? (
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-accent shrink-0">
              Partner
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted">
          <Star className="h-3 w-3 fill-amber-400 stroke-amber-500" />
          <span className="font-medium text-text">{loc.rating.toFixed(1)}</span>
          <span className="text-text-subtle">({loc.reviews})</span>
          <span className="mx-1 text-text-subtle">·</span>
          <span className="truncate">{loc.address}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
          <span
            className={cn(
              "inline-flex items-center gap-1",
              loc.isOpen ? "text-success" : "text-text-subtle",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                loc.isOpen ? "bg-success" : "bg-text-subtle",
              )}
            />
            {loc.isOpen ? "Open now" : "Closed"}
          </span>
          <span className="text-text-subtle">·</span>
          <a
            href={`tel:${loc.phone.replace(/[^0-9+]/g, "")}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 hover:text-text transition-colors"
          >
            <Phone className="h-3 w-3" />
            {loc.phone}
          </a>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="inline-flex items-center gap-1 text-[12px] font-medium text-text">
          <MapPin className="h-3 w-3 text-accent" />
          {loc.distanceMiles.toFixed(1)} mi
        </div>
        <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-accent">
          <Navigation className="h-2.5 w-2.5" />
          Show on map
        </div>
      </div>
    </motion.button>
  );
}
