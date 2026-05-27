"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldGroup, Input, Textarea } from "@/components/ui/input";
import type { SupplyOrderRow } from "@/app/(operator)/ops/supplies/_placeholder-types";
import {
  approveSupplyOrder,
  editSupplyOrderDraft,
  rejectSupplyOrder,
} from "@/app/(operator)/ops/supplies/actions";

function fmt(c: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
}
function age(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const m = Math.round((Date.now() - t) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function AgentDraftedCard({ row }: { row: SupplyOrderRow }) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "edit" | "reject">("idle");
  const [qty, setQty] = useState(row.qty);
  const [unitCostCents, setUnitCostCents] = useState(row.unitCostCents);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [justApproved, setJustApproved] = useState(false);

  function go(fn: () => Promise<void>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        onOk?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  return (
    <Card
      tone="raised"
      className={"transition-all duration-300 " + (justApproved ? "ring-2 ring-accent/40 scale-[0.995]" : "")}
    >
      <CardContent className="py-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-lg text-text leading-tight">{row.supplyName}</h3>
              <Badge tone={row.proposedBy.kind === "agent" ? "accent" : "neutral"}>
                {row.proposedByLabel}
              </Badge>
              {row.autoSubmitted && (
                <Badge
                  tone="highlight"
                  title="Auto-submitted by the agent under your configured trust threshold. See audit trail for the policy snapshot."
                >
                  Auto-submitted
                </Badge>
              )}
            </div>
            <p className="text-xs text-text-subtle mt-1">
              {row.supplierName ?? "No supplier yet"} · {age(row.createdAt)}
              {row.expectedDeliveryAt && ` · ETA ${new Date(row.expectedDeliveryAt).toLocaleDateString()}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-display text-text tabular-nums leading-none">{fmt(row.totalCents)}</p>
            <p className="text-[11px] text-text-subtle mt-1 tabular-nums">
              {row.qty} × {fmt(row.unitCostCents)}
            </p>
          </div>
        </div>

        {mode === "edit" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
            <FieldGroup label="Quantity">
              <Input type="number" min={1} value={qty} disabled={pending}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
            </FieldGroup>
            <FieldGroup label="Unit cost (¢)">
              <Input type="number" min={0} value={unitCostCents} disabled={pending}
                onChange={(e) => setUnitCostCents(Math.max(0, Number(e.target.value) || 0))} />
            </FieldGroup>
            <div className="flex flex-col justify-end">
              <p className="text-xs text-text-subtle mb-1.5">Projected total</p>
              <p className="text-base font-medium text-text tabular-nums h-10 flex items-center">
                {fmt(qty * unitCostCents)}
              </p>
            </div>
            <div className="sm:col-span-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setMode("idle")} disabled={pending}>Cancel</Button>
              <Button size="sm" disabled={pending}
                onClick={() => go(() => editSupplyOrderDraft(row.id, { qty, unitCostCents }), () => setMode("idle"))}>
                Save changes
              </Button>
            </div>
          </div>
        )}

        {mode === "reject" && (
          <div className="pt-2 border-t border-border/60 space-y-3">
            <FieldGroup label="Reason for rejection" hint="The agent uses this to improve future drafts.">
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} disabled={pending}
                placeholder="e.g. We just got a bulk delivery yesterday." />
            </FieldGroup>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setMode("idle")} disabled={pending}>Cancel</Button>
              <Button variant="danger" size="sm" disabled={pending}
                onClick={() => {
                  if (!reason.trim()) return setError("Please add a reason so the agent learns.");
                  go(() => rejectSupplyOrder(row.id, reason.trim()), () => setMode("idle"));
                }}>
                Reject
              </Button>
            </div>
          </div>
        )}

        {mode === "idle" && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="lg" variant="primary" className="min-w-[200px]"
              onClick={() => go(() => approveSupplyOrder(row.id), () => setJustApproved(true))}
              disabled={pending || justApproved}>
              {justApproved ? "Approved" : "Approve & submit"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setMode("edit")} disabled={pending}>Edit qty / cost</Button>
            <Button variant="ghost" size="sm" onClick={() => setMode("reject")} disabled={pending}>Reject</Button>
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}
      </CardContent>
    </Card>
  );
}
