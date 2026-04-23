"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export interface CptCode {
  code: string;
  description: string;
  fee: number;
  category: string;
}

export const CPT_CODES: CptCode[] = [
  { code: "99201", description: "New patient office visit, 10 min (straightforward)", fee: 75, category: "New patient" },
  { code: "99202", description: "New patient office visit, 15-29 min (low MDM)", fee: 110, category: "New patient" },
  { code: "99203", description: "New patient office visit, 30-44 min (low-mod MDM)", fee: 160, category: "New patient" },
  { code: "99204", description: "New patient office visit, 45-59 min (mod MDM)", fee: 240, category: "New patient" },
  { code: "99205", description: "New patient office visit, 60-74 min (high MDM)", fee: 325, category: "New patient" },
  { code: "99211", description: "Established patient, minimal (nurse visit)", fee: 25, category: "Established" },
  { code: "99212", description: "Established patient, 10-19 min (straightforward)", fee: 55, category: "Established" },
  { code: "99213", description: "Established patient, 20-29 min (low MDM)", fee: 95, category: "Established" },
  { code: "99214", description: "Established patient, 30-39 min (mod MDM)", fee: 140, category: "Established" },
  { code: "99215", description: "Established patient, 40-54 min (high MDM)", fee: 200, category: "Established" },
  { code: "99441", description: "Telephone E/M, 5-10 min", fee: 30, category: "Phone" },
  { code: "99442", description: "Telephone E/M, 11-20 min", fee: 60, category: "Phone" },
  { code: "99443", description: "Telephone E/M, 21-30 min", fee: 90, category: "Phone" },
  { code: "99421", description: "Online digital E/M, 5-10 min cumulative over 7 days", fee: 25, category: "Online" },
  { code: "99422", description: "Online digital E/M, 11-20 min cumulative over 7 days", fee: 50, category: "Online" },
  { code: "99381", description: "Preventive exam, new patient, under 1 year", fee: 150, category: "Preventive" },
  { code: "96127", description: "Brief emotional/behavioral assessment (PHQ-9, GAD-7)", fee: 12, category: "Behavioral" },
  { code: "99497", description: "Advance care planning, first 30 min", fee: 85, category: "Advance care" },
];

interface CptPickerProps {
  value?: string | null;
  onChange: (code: CptCode | null) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Searchable dropdown of CPT codes common in cannabis / primary care.
 */
export function CptPicker({
  value,
  onChange,
  placeholder = "Search CPT code or description...",
  className,
}: CptPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => (value ? CPT_CODES.find((c) => c.code === value) ?? null : null),
    [value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CPT_CODES;
    return CPT_CODES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, CptCode[]>();
    for (const c of filtered) {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category)!.push(c);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className={cn("relative", className)}>
      {selected && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left rounded-md border border-border-strong bg-surface hover:bg-surface-muted transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs text-accent tabular-nums shrink-0">
              {selected.code}
            </span>
            <span className="text-sm text-text truncate">
              {selected.description}
            </span>
          </div>
          <span className="text-sm text-text-muted tabular-nums shrink-0">
            ${selected.fee}
          </span>
        </button>
      ) : (
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
        />
      )}

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface-raised shadow-lg">
            {grouped.length === 0 ? (
              <p className="px-3 py-4 text-sm text-text-subtle">
                No CPT codes match.
              </p>
            ) : (
              grouped.map(([category, codes]) => (
                <div key={category}>
                  <p className="sticky top-0 bg-surface-muted px-3 py-1 text-[10px] uppercase tracking-wider text-text-subtle font-medium">
                    {category}
                  </p>
                  <ul>
                    {codes.map((c) => (
                      <li key={c.code}>
                        <button
                          type="button"
                          onClick={() => {
                            onChange(c);
                            setQuery("");
                            setOpen(false);
                          }}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-muted"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs text-accent tabular-nums w-14 shrink-0">
                              {c.code}
                            </span>
                            <span className="text-text truncate">
                              {c.description}
                            </span>
                          </div>
                          <span className="text-xs text-text-muted tabular-nums shrink-0">
                            ${c.fee}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {selected && (
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-subtle hover:text-danger"
          aria-label="Clear selection"
        >
          {open ? "" : "×"}
        </button>
      )}
    </div>
  );
}
