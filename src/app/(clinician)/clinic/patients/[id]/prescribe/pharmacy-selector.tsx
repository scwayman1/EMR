"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { DEMO_PHARMACIES, type Pharmacy } from "@/lib/domain/e-prescribe";

interface PharmacySelectorProps {
  selectedId: string | null;
  onSelect: (pharmacy: Pharmacy) => void;
  patientState?: string;
}

export function PharmacySelector({ selectedId, onSelect, patientState }: PharmacySelectorProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const pharmacies = patientState
      ? [...DEMO_PHARMACIES].sort((a, b) => {
          const aMatch = a.state === patientState ? 0 : 1;
          const bMatch = b.state === patientState ? 0 : 1;
          return aMatch - bMatch;
        })
      : DEMO_PHARMACIES;

    if (!search.trim()) return pharmacies;
    const q = search.toLowerCase();
    return pharmacies.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q)
    );
  }, [search, patientState]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pharmacy</CardTitle>
        <CardDescription>Select where to send this prescription</CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          placeholder="Search pharmacies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3"
        />
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filtered.map((pharm) => (
            <button
              key={pharm.id}
              type="button"
              onClick={() => onSelect(pharm)}
              className={cn(
                "w-full text-left rounded-lg border px-4 py-3 transition-all",
                selectedId === pharm.id
                  ? "border-accent bg-accent-soft ring-2 ring-accent/20"
                  : "border-border hover:border-border-strong hover:bg-surface-muted"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-text">{pharm.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">{pharm.address}</p>
                  <p className="text-xs text-text-subtle mt-0.5">
                    {pharm.phone} &middot; Fax: {pharm.fax}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {pharm.acceptsCannabis && (
                    <Badge tone="success" className="text-[10px]">Cannabis OK</Badge>
                  )}
                  {patientState && pharm.state === patientState && (
                    <Badge tone="accent" className="text-[10px]">Patient's state</Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-text-muted py-4 text-center">
              No pharmacies match your search.
            </p>
          )}
        </div>

        {/* Hidden input for form submission */}
        {selectedId && (
          <>
            <input type="hidden" name="pharmacyId" value={selectedId} />
            <input
              type="hidden"
              name="pharmacyName"
              value={DEMO_PHARMACIES.find((p) => p.id === selectedId)?.name ?? ""}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
