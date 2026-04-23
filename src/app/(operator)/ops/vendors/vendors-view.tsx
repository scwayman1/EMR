"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldGroup, Input } from "@/components/ui/input";
import type { Vendor } from "@/lib/domain/overnight-batch";
import { cn } from "@/lib/utils/cn";

const CATEGORIES = [
  "IT",
  "Software",
  "Medical Supplies",
  "Insurance",
  "Legal",
  "Accounting",
  "Cleaning",
  "Marketing",
];

// Today is 2026-04-16 per CLAUDE.md
const TODAY = new Date("2026-04-16T00:00:00Z");
const THIRTY_DAYS_MS = 30 * 86_400_000;

function daysUntil(end?: string): number | null {
  if (!end) return null;
  const d = new Date(end);
  return Math.round((d.getTime() - TODAY.getTime()) / 86_400_000);
}

export function VendorsView({ initialVendors }: { initialVendors: Vendor[] }) {
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    category: "IT",
    contactName: "",
    email: "",
    phone: "",
    contractEnds: "",
    monthlyCost: 0,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vendors.filter((v) => {
      if (category !== "all" && v.category !== category) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        (v.contactName ?? "").toLowerCase().includes(q) ||
        (v.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [vendors, query, category]);

  const expiring = useMemo(
    () =>
      vendors.filter((v) => {
        const d = daysUntil(v.contractEnds);
        return d !== null && d >= 0 && d <= 30;
      }),
    [vendors],
  );

  function addVendor() {
    if (!draft.name.trim()) return;
    const v: Vendor = {
      id: `v-${Date.now()}`,
      name: draft.name.trim(),
      category: draft.category,
      contactName: draft.contactName.trim() || undefined,
      email: draft.email.trim() || undefined,
      phone: draft.phone.trim() || undefined,
      contractEnds: draft.contractEnds || undefined,
      monthlyCost: draft.monthlyCost || undefined,
      active: true,
    };
    setVendors((prev) => [v, ...prev]);
    setShowAdd(false);
    setDraft({
      name: "",
      category: "IT",
      contactName: "",
      email: "",
      phone: "",
      contractEnds: "",
      monthlyCost: 0,
    });
  }

  return (
    <div className="space-y-5">
      {expiring.length > 0 && (
        <Card tone="raised" className="border-amber-300/60 bg-amber-50/60">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-amber-900">
              {expiring.length} {expiring.length === 1 ? "contract" : "contracts"} expiring in 30 days
            </p>
            <p className="text-xs text-amber-800/80 mt-1">
              {expiring.map((v) => `${v.name} (${v.contractEnds})`).join(" · ")}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            type="search"
            placeholder="Search vendors…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="md:w-64"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-border-strong bg-surface px-3 h-9 text-sm text-text"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          Add vendor
        </Button>
      </div>

      <Card tone="raised">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-text-subtle border-b border-border">
                <th className="px-5 py-3 font-medium">Vendor</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium text-right">Monthly</th>
                <th className="px-5 py-3 font-medium">Contract ends</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => {
                const d = daysUntil(v.contractEnds);
                const expiring = d !== null && d >= 0 && d <= 30;
                return (
                  <tr key={v.id} className="border-b border-border/40 hover:bg-surface-muted/40">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-text">{v.name}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone="neutral">{v.category}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-text-muted">
                      <div>{v.contactName ?? "—"}</div>
                      <div className="text-[11px] text-text-subtle">
                        {v.email ?? ""} {v.phone ? `· ${v.phone}` : ""}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {v.monthlyCost ? `$${v.monthlyCost.toLocaleString()}` : "—"}
                    </td>
                    <td className={cn("px-5 py-3.5 text-xs", expiring ? "text-[color:var(--highlight-hover)]" : "text-text-muted")}>
                      {v.contractEnds ? (
                        <>
                          <div>{v.contractEnds}</div>
                          {d !== null && (
                            <div className="text-[10px] text-text-subtle">
                              {d < 0 ? "expired" : `${d} days`}
                              {expiring && " — renew soon"}
                            </div>
                          )}
                        </>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-text-subtle text-sm">
                    No vendors match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowAdd(false)}
        >
          <Card tone="raised" className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="py-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-text-subtle mb-1">New</p>
                <h3 className="font-display text-lg text-text">Add vendor</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldGroup label="Name">
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </FieldGroup>
                <FieldGroup label="Category">
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    className="flex w-full rounded-md border border-border-strong bg-surface px-3 h-10 text-sm text-text"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </FieldGroup>
                <FieldGroup label="Contact name">
                  <Input
                    value={draft.contactName}
                    onChange={(e) => setDraft({ ...draft, contactName: e.target.value })}
                  />
                </FieldGroup>
                <FieldGroup label="Email">
                  <Input
                    type="email"
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  />
                </FieldGroup>
                <FieldGroup label="Phone">
                  <Input
                    value={draft.phone}
                    onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  />
                </FieldGroup>
                <FieldGroup label="Contract ends">
                  <Input
                    type="date"
                    value={draft.contractEnds}
                    onChange={(e) => setDraft({ ...draft, contractEnds: e.target.value })}
                  />
                </FieldGroup>
                <FieldGroup label="Monthly cost ($)">
                  <Input
                    type="number"
                    min={0}
                    value={draft.monthlyCost}
                    onChange={(e) => setDraft({ ...draft, monthlyCost: Number(e.target.value) || 0 })}
                  />
                </FieldGroup>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={addVendor} disabled={!draft.name.trim()}>
                  Save vendor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
