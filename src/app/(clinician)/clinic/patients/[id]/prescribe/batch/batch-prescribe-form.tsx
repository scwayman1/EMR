"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ClaudeProcessing } from "@/components/ui/claude-processing";
import { createBatchPrescriptionsAction } from "./actions";

type Product = {
  id: string;
  name: string;
  brand: string | null;
  productType: string;
  thcConcentration: number | null;
  cbdConcentration: number | null;
  cbnConcentration: number | null;
  cbgConcentration: number | null;
  concentrationUnit: string;
};

type CartItem = {
  productId: string;
  volumePerDose: number;
  volumeUnit: string;
  frequencyPerDay: number;
  daysSupply: number;
  refills: number;
  timingInstructions: string;
};

type Props = {
  patientId: string;
  patientName: string;
  existingMeds: { id: string; name: string; dosage: string | null }[];
  products: Product[];
};

const EMPTY_ITEM: Omit<CartItem, "productId"> = {
  volumePerDose: 1,
  volumeUnit: "mL",
  frequencyPerDay: 2,
  daysSupply: 30,
  refills: 2,
  timingInstructions: "",
};

export function BatchPrescribeForm({ patientId, patientName, existingMeds, products }: Props) {
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [picker, setPicker] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [doubleCheck, setDoubleCheck] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const productsById = React.useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const addToCart = () => {
    if (!picker) return;
    if (cart.find((c) => c.productId === picker)) return; // no dup adds
    setCart((c) => [...c, { ...EMPTY_ITEM, productId: picker }]);
    setPicker("");
  };

  const updateItem = (idx: number, patch: Partial<CartItem>) =>
    setCart((c) => c.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const removeItem = (idx: number) =>
    setCart((c) => c.filter((_, i) => i !== idx));

  // Pure-client cross-cart safety summary. The server runs the
  // authoritative check on submit; this version is for the double-check
  // modal so the clinician sees what they're acknowledging.
  const cartCannabinoids = React.useMemo(() => {
    const set = new Set<string>();
    for (const item of cart) {
      const p = productsById.get(item.productId);
      if (!p) continue;
      if (p.thcConcentration && p.thcConcentration > 0) set.add("THC");
      if (p.cbdConcentration && p.cbdConcentration > 0) set.add("CBD");
      if (p.cbnConcentration && p.cbnConcentration > 0) set.add("CBN");
      if (p.cbgConcentration && p.cbgConcentration > 0) set.add("CBG");
    }
    return Array.from(set);
  }, [cart, productsById]);

  // Duplicate-therapy heuristic: two items with the same productType
  // (e.g. two oils) usually means the clinician meant to titrate one,
  // not stack two. Show as a warning, not a block.
  const duplicateTypes = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of cart) {
      const p = productsById.get(item.productId);
      if (!p) continue;
      counts.set(p.productType, (counts.get(p.productType) ?? 0) + 1);
    }
    return Array.from(counts.entries()).filter(([, n]) => n > 1).map(([t]) => t);
  }, [cart, productsById]);

  const onSubmit = async () => {
    if (!doubleCheck || cart.length === 0) return;
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await createBatchPrescriptionsAction({
        patientId,
        items: cart.map((c) => ({
          productId: c.productId,
          volumePerDose: c.volumePerDose,
          volumeUnit: c.volumeUnit,
          frequencyPerDay: c.frequencyPerDay,
          daysSupply: c.daysSupply,
          refills: c.refills,
          timingInstructions: c.timingInstructions,
        })) as any,
        doubleCheckAcknowledged: "true" as const,
      });
      if (!result.ok) {
        setServerError(result.error);
        setSubmitting(false);
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to submit cart.");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Picker */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-[11px] uppercase tracking-[0.12em] text-text-subtle font-medium mb-3">
            Add medication to cart
          </p>
          <div className="flex items-center gap-3">
            <select
              value={picker}
              onChange={(e) => setPicker(e.target.value)}
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="">Pick a cannabis product…</option>
              {products
                .filter((p) => !cart.find((c) => c.productId === p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.brand ? ` · ${p.brand}` : ""}
                  </option>
                ))}
            </select>
            <Button onClick={addToCart} disabled={!picker || cart.length >= 8}>
              Add to cart
            </Button>
          </div>
          {cart.length >= 8 && (
            <p className="mt-2 text-[11px] text-warning">
              Cart is full. Submit or remove items to add more (8 max per
              session — keeps the double-check tractable).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cart items */}
      {cart.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          description={`Add 1–8 cannabis products above. The double-check at the bottom will scan them together against ${patientName}'s active medication list.`}
        />
      ) : (
        <div className="space-y-3">
          {cart.map((item, idx) => {
            const product = productsById.get(item.productId);
            if (!product) return null;
            const thcDose = (product.thcConcentration ?? 0) * item.volumePerDose;
            const cbdDose = (product.cbdConcentration ?? 0) * item.volumePerDose;
            return (
              <Card key={item.productId}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-medium text-text">
                        {product.name}
                        {product.brand && (
                          <span className="text-text-subtle font-normal">
                            {" "}· {product.brand}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-text-subtle uppercase tracking-wider mt-0.5">
                        {product.productType.replace("_", " ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-xs text-text-subtle hover:text-danger"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <Field label="Vol / dose">
                      <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={item.volumePerDose}
                        onChange={(e) =>
                          updateItem(idx, { volumePerDose: Number(e.target.value) })
                        }
                        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                      />
                    </Field>
                    <Field label="Unit">
                      <input
                        type="text"
                        value={item.volumeUnit}
                        onChange={(e) => updateItem(idx, { volumeUnit: e.target.value })}
                        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                      />
                    </Field>
                    <Field label="× per day">
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={item.frequencyPerDay}
                        onChange={(e) =>
                          updateItem(idx, { frequencyPerDay: Number(e.target.value) })
                        }
                        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                      />
                    </Field>
                    <Field label="Days supply">
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={item.daysSupply}
                        onChange={(e) =>
                          updateItem(idx, { daysSupply: Number(e.target.value) })
                        }
                        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                      />
                    </Field>
                    <Field label="Refills">
                      <input
                        type="number"
                        min={0}
                        max={12}
                        value={item.refills}
                        onChange={(e) => updateItem(idx, { refills: Number(e.target.value) })}
                        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                      />
                    </Field>
                  </div>
                  {(thcDose > 0 || cbdDose > 0) && (
                    <p className="mt-3 text-[11px] text-text-subtle">
                      Per dose:{" "}
                      {thcDose > 0 && <Badge tone="accent" className="mr-1">{thcDose.toFixed(1)} mg THC</Badge>}
                      {cbdDose > 0 && <Badge tone="info" className="mr-1">{cbdDose.toFixed(1)} mg CBD</Badge>}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Double-check */}
      {cart.length > 0 && (
        <Card tone="ambient">
          <CardContent className="pt-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-text-subtle font-medium mb-3">
              Double check
            </p>
            <ul className="space-y-2 text-sm mb-4">
              <li>
                <strong>{cart.length}</strong>{" "}
                {cart.length === 1 ? "prescription" : "prescriptions"} will be
                signed and sent in one batch.
              </li>
              <li>
                Cannabinoids in cart:{" "}
                <span className="font-mono text-text">
                  {cartCannabinoids.length > 0 ? cartCannabinoids.join(", ") : "none detected"}
                </span>
              </li>
              <li>
                Existing active medications:{" "}
                <span className="text-text-subtle">
                  {existingMeds.length > 0
                    ? existingMeds.map((m) => m.name).join(", ")
                    : "none on file"}
                </span>
              </li>
              {duplicateTypes.length > 0 && (
                <li className="text-warning">
                  ⚠ Cart contains {duplicateTypes.length} duplicate product
                  type{duplicateTypes.length === 1 ? "" : "s"} (
                  {duplicateTypes.join(", ")}). Confirm this is intentional and
                  not a missed titration.
                </li>
              )}
            </ul>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={doubleCheck}
                onChange={(e) => setDoubleCheck(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I have reviewed every item in the cart, the cross-cart
                cannabinoid summary, and the patient's active medication list.
                I am ready to sign and send all {cart.length} prescriptions.
              </span>
            </label>
            {serverError && (
              <p className="mt-3 text-sm text-danger">{serverError}</p>
            )}
            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={onSubmit}
                disabled={!doubleCheck || submitting}
                size="lg"
              >
                {submitting ? "Signing…" : `Sign & send ${cart.length}`}
              </Button>
              {submitting && <ClaudeProcessing label="Running cross-med safety scan" inline />}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-text-subtle mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
