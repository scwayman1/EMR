"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";
import { approveRefillAction, denyRefillAction } from "./actions";

export interface RefillRow {
  id: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  medicationName: string;
  medicationDosage: string;
  medicationType: string;
  requestedQty: number;
  requestedDays: number | null;
  pharmacyName: string;
  pharmacyPhone: string | null;
  pharmacyAddress: string | null;
  receivedAt: string;
  status: string;
  copilotSuggestion: string | null;
  safetyFlags: string[];
  rationale: string | null;
  lastRelevantLab: {
    id: string;
    panelName: string;
    receivedAt: string;
  } | null;
}

const FLAG_LABELS: Record<string, { label: string; tone: "danger" | "warning" }> = {
  CONTROLLED_SUBSTANCE: {
    label: "Controlled substance",
    tone: "warning",
  },
  MONITORING_LAB_MISSING: {
    label: "Monitoring lab missing",
    tone: "danger",
  },
  MONITORING_LAB_STALE: {
    label: "Monitoring lab stale",
    tone: "danger",
  },
};

const SUGGESTION_TONE: Record<string, "success" | "warning" | "danger"> = {
  approve: "success",
  review: "warning",
  deny: "danger",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function patientLabel(first: string, last: string) {
  return `${first} ${last.charAt(0).toUpperCase()}.`;
}

export function RefillsView({ rows }: { rows: RefillRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className="w-full text-left flex items-center gap-4 px-6 py-4 hover:bg-surface-muted transition-colors"
                >
                  <Avatar
                    firstName={row.patientFirstName}
                    lastName={row.patientLastName}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-text">
                        {patientLabel(row.patientFirstName, row.patientLastName)}
                      </p>
                      <span className="text-xs text-text-subtle">·</span>
                      <p className="text-sm text-text-muted">
                        {row.medicationName}
                        {row.medicationDosage && ` · ${row.medicationDosage}`}
                      </p>
                      {row.copilotSuggestion && (
                        <Badge
                          tone={SUGGESTION_TONE[row.copilotSuggestion] ?? "neutral"}
                          className="text-[10px]"
                        >
                          {row.copilotSuggestion}
                        </Badge>
                      )}
                      {row.safetyFlags.slice(0, 2).map((f) => {
                        const meta = FLAG_LABELS[f];
                        if (!meta) return null;
                        return (
                          <Badge key={f} tone={meta.tone} className="text-[10px]">
                            {meta.label}
                          </Badge>
                        );
                      })}
                    </div>
                    <p className="text-xs text-text-subtle mt-0.5">
                      #{row.requestedQty}
                      {row.requestedDays && ` · ${row.requestedDays}-day supply`}
                      {" · "}
                      {row.pharmacyName}
                      {" · requested "}
                      {fmtDate(row.receivedAt)}
                    </p>
                  </div>
                  <span className="text-xs text-accent">Review &rarr;</span>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {selected && (
        <RefillOverlay row={selected} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}

function RefillOverlay({ row, onClose }: { row: RefillRow; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [denyMode, setDenyMode] = useState(false);
  const [denyReason, setDenyReason] = useState("");

  const approve = () => {
    setError(null);
    startTransition(async () => {
      const res = await approveRefillAction(row.id);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  };

  const deny = () => {
    setError(null);
    startTransition(async () => {
      const res = await denyRefillAction(row.id, denyReason);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Refill review for ${row.patientFirstName} ${row.patientLastName}`}
    >
      <div
        className="bg-bg rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4 sticky top-0 bg-bg z-10">
          <div>
            <p className="text-xs uppercase tracking-wider text-text-subtle font-medium">
              Refill request
            </p>
            <h2 className="font-display text-2xl text-text tracking-tight mt-1">
              {row.patientFirstName} {row.patientLastName}
            </h2>
            <p className="text-sm text-text-muted mt-1">
              {row.medicationName}
              {row.medicationDosage && ` · ${row.medicationDosage}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-subtle hover:text-text text-xl leading-none px-2"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Copilot suggestion */}
          {row.copilotSuggestion && (
            <section
              className={cn(
                "rounded-xl px-4 py-3 border",
                row.copilotSuggestion === "approve"
                  ? "bg-success/5 border-success/20"
                  : row.copilotSuggestion === "deny"
                    ? "bg-red-50 border-red-200"
                    : "bg-highlight-soft border-highlight/20"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wider text-text-subtle font-medium">
                  Refill Copilot
                </span>
                <Badge
                  tone={SUGGESTION_TONE[row.copilotSuggestion] ?? "neutral"}
                  className="text-[10px]"
                >
                  Suggests: {row.copilotSuggestion}
                </Badge>
              </div>
              {row.rationale && (
                <p className="text-sm text-text leading-relaxed">{row.rationale}</p>
              )}
              {row.safetyFlags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {row.safetyFlags.map((f) => {
                    const meta = FLAG_LABELS[f];
                    return (
                      <Badge
                        key={f}
                        tone={meta?.tone ?? "warning"}
                        className="text-[10px]"
                      >
                        {meta?.label ?? f}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Request details */}
          <section className="grid grid-cols-2 gap-4 text-sm">
            <DetailRow label="Quantity" value={`#${row.requestedQty}`} />
            <DetailRow
              label="Days supply"
              value={row.requestedDays ? `${row.requestedDays} days` : "—"}
            />
            <DetailRow label="Type" value={row.medicationType} />
            <DetailRow label="Requested" value={fmtDate(row.receivedAt)} />
          </section>

          {/* Pharmacy */}
          <section>
            <p className="text-xs uppercase tracking-wider text-text-subtle font-medium mb-2">
              Pharmacy
            </p>
            <div className="rounded-lg bg-surface-muted/60 px-4 py-3 text-sm">
              <p className="font-medium text-text">{row.pharmacyName}</p>
              {row.pharmacyPhone && (
                <p className="text-text-muted text-xs mt-0.5">{row.pharmacyPhone}</p>
              )}
              {row.pharmacyAddress && (
                <p className="text-text-muted text-xs">{row.pharmacyAddress}</p>
              )}
            </div>
          </section>

          {/* Last relevant lab */}
          {row.lastRelevantLab && (
            <section>
              <p className="text-xs uppercase tracking-wider text-text-subtle font-medium mb-2">
                Last relevant lab
              </p>
              <div className="rounded-lg bg-surface-muted/60 px-4 py-3 text-sm flex items-center justify-between">
                <div>
                  <p className="font-medium text-text">
                    {row.lastRelevantLab.panelName}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Received {fmtDate(row.lastRelevantLab.receivedAt)}
                  </p>
                </div>
              </div>
            </section>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          {/* Action bar */}
          <section className="pt-4 border-t border-border">
            {denyMode ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-text">
                  Reason for denial
                </label>
                <textarea
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Patient needs a visit before refill; flagged by copilot; dose change pending"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text resize-y focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setDenyMode(false);
                      setDenyReason("");
                    }}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={deny}
                    disabled={pending || !denyReason.trim()}
                    size="sm"
                  >
                    {pending ? "Denying…" : "Deny refill"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setDenyMode(true)}
                  disabled={pending}
                >
                  Deny
                </Button>
                <Button onClick={approve} disabled={pending}>
                  {pending ? "Approving…" : "Approve & send to pharmacy"}
                </Button>
              </div>
            )}
            <p className="text-[11px] text-text-subtle mt-3">
              Phase 1 stub: approving marks the refill signed and queues it for
              the pharmacy. Real Surescripts transmission lands in Phase 2
              (MALLIK-012).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-text-subtle font-medium mb-0.5">
        {label}
      </p>
      <p className="text-sm text-text">{value}</p>
    </div>
  );
}
