"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { collectPayment, type CollectResult } from "./actions";
import { Button } from "@/components/ui/button";

type Method = "card" | "ach" | "cash" | "check";

export function CollectPaymentForm({
  patientId,
  suggestedAmountCents,
  hasCardOnFile,
  cardLast4,
  cardBrand,
}: {
  patientId: string;
  suggestedAmountCents: number;
  hasCardOnFile: boolean;
  cardLast4: string | null;
  cardBrand: string | null;
}) {
  const [state, formAction] = useFormState<CollectResult | null, FormData>(
    collectPayment,
    null,
  );
  const [method, setMethod] = useState<Method>("card");
  const [amount, setAmount] = useState(
    suggestedAmountCents > 0 ? (suggestedAmountCents / 100).toFixed(2) : "",
  );

  if (state?.ok) {
    return (
      <div className="text-center py-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
            <path
              d="M4.5 7L6 8.5L9.5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Payment recorded
        </div>
        <p className="text-xs text-text-muted mt-3">
          Refresh to see the updated balance.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="patientId" value={patientId} />

      {/* Amount input */}
      <div>
        <label className="text-[10px] font-medium uppercase tracking-wider text-text-subtle block mb-1">
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            $
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full pl-7 pr-3 py-2 rounded-md border border-border bg-surface text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 tabular-nums"
          />
          <input
            type="hidden"
            name="amountCents"
            value={Math.round((parseFloat(amount) || 0) * 100)}
          />
        </div>
      </div>

      {/* Method selector */}
      <div>
        <label className="text-[10px] font-medium uppercase tracking-wider text-text-subtle block mb-1.5">
          Method
        </label>
        <div className="grid grid-cols-4 gap-1">
          {(["card", "ach", "cash", "check"] as Method[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`text-[11px] py-1.5 rounded-md transition-all capitalize ${
                method === m
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "bg-surface-muted text-text-muted hover:bg-surface border border-border"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <input type="hidden" name="method" value={method} />
      </div>

      {/* Card-on-file note */}
      {method === "card" && hasCardOnFile && cardLast4 && (
        <p className="text-[11px] text-text-subtle">
          Will use {cardBrand} •{cardLast4} on file
        </p>
      )}
      {method === "card" && !hasCardOnFile && (
        <p className="text-[11px] text-[color:var(--warning)]">
          No card on file — will prompt patient to enter
        </p>
      )}

      {/* Reference */}
      {(method === "check" || method === "cash") && (
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-text-subtle block mb-1">
            {method === "check" ? "Check #" : "Reference"}
          </label>
          <input
            type="text"
            name="reference"
            placeholder={method === "check" ? "1234" : "Receipt #"}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
      )}

      {state?.ok === false && (
        <p className="text-xs text-danger">{state.error}</p>
      )}

      <SubmitButton disabled={!amount || parseFloat(amount) <= 0} />

      {suggestedAmountCents === 0 && (
        <p className="text-[11px] text-text-subtle text-center">
          No balance due — overpayment will create a credit.
        </p>
      )}
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      className="w-full"
      disabled={pending || disabled}
    >
      {pending ? "Recording..." : "Collect payment"}
    </Button>
  );
}
