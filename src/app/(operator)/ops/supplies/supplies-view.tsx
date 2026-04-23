"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldGroup, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export interface Supply {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  reorderPoint: number;
  supplier: string;
}

interface Order {
  id: string;
  supplyId: string;
  supplyName: string;
  quantity: number;
  supplier: string;
  placedAt: string;
  status: "pending" | "delivered";
  deliveredAt?: string;
}

const SUPPLIERS = [
  "Henry Schein",
  "McKesson",
  "Medline",
  "Welch Allyn",
  "Siemens Lab",
  "BD",
  "Clorox Pro",
  "Purell",
  "Staples",
];

export function SuppliesView({ initialSupplies }: { initialSupplies: Supply[] }) {
  const [supplies, setSupplies] = useState<Supply[]>(initialSupplies);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordering, setOrdering] = useState<Supply | null>(null);
  const [orderQty, setOrderQty] = useState<number>(0);
  const [orderSupplier, setOrderSupplier] = useState<string>("");

  const lowStock = useMemo(
    () => supplies.filter((s) => s.quantity <= s.reorderPoint),
    [supplies],
  );

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const deliveredOrders = orders.filter((o) => o.status === "delivered");

  function placeOrder() {
    if (!ordering || orderQty <= 0) return;
    const order: Order = {
      id: `ord-${Date.now()}`,
      supplyId: ordering.id,
      supplyName: ordering.name,
      quantity: orderQty,
      supplier: orderSupplier || ordering.supplier,
      placedAt: new Date().toISOString(),
      status: "pending",
    };
    setOrders((prev) => [order, ...prev]);
    setOrdering(null);
    setOrderQty(0);
    setOrderSupplier("");
  }

  function markDelivered(o: Order) {
    setOrders((prev) =>
      prev.map((x) =>
        x.id === o.id ? { ...x, status: "delivered", deliveredAt: new Date().toISOString() } : x,
      ),
    );
    setSupplies((prev) =>
      prev.map((s) => (s.id === o.supplyId ? { ...s, quantity: s.quantity + o.quantity } : s)),
    );
  }

  return (
    <div className="space-y-6">
      {lowStock.length > 0 && (
        <Card tone="raised" className="border-amber-300/60 bg-amber-50/60">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-amber-900">
              {lowStock.length} {lowStock.length === 1 ? "supply is" : "supplies are"} at or below reorder point
            </p>
            <p className="text-xs text-amber-800/80 mt-1">
              {lowStock.map((s) => s.name).slice(0, 4).join(" · ")}
              {lowStock.length > 4 && ` · +${lowStock.length - 4} more`}
            </p>
          </CardContent>
        </Card>
      )}

      <Card tone="raised">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-text-subtle border-b border-border">
                <th className="px-5 py-3 font-medium">Supply</th>
                <th className="px-5 py-3 font-medium">Supplier</th>
                <th className="px-5 py-3 font-medium text-right">On hand</th>
                <th className="px-5 py-3 font-medium text-right">Reorder at</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {supplies.map((s) => {
                const low = s.quantity <= s.reorderPoint;
                return (
                  <tr key={s.id} className="border-b border-border/40 hover:bg-surface-muted/40">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-text">{s.name}</p>
                      <p className="text-[11px] text-text-subtle">{s.unit}</p>
                    </td>
                    <td className="px-5 py-3.5 text-text-muted text-xs">{s.supplier}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{s.quantity}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-text-muted">{s.reorderPoint}</td>
                    <td className="px-5 py-3.5">
                      {low ? <Badge tone="warning">Low</Badge> : <Badge tone="success">OK</Badge>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant={low ? "primary" : "secondary"}
                        onClick={() => {
                          setOrdering(s);
                          setOrderQty(Math.max(s.reorderPoint * 2, 5));
                          setOrderSupplier(s.supplier);
                        }}
                      >
                        Order
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card tone="raised">
          <CardContent className="py-5">
            <p className="text-sm font-medium text-text mb-3">Pending orders</p>
            {pendingOrders.length === 0 ? (
              <p className="text-xs text-text-subtle">No pending orders.</p>
            ) : (
              <ul className="divide-y divide-border/70 text-sm">
                {pendingOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-text truncate">{o.supplyName}</p>
                      <p className="text-[11px] text-text-subtle">
                        {o.quantity} · {o.supplier} · {new Date(o.placedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => markDelivered(o)}>
                      Mark delivered
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card tone="raised">
          <CardContent className="py-5">
            <p className="text-sm font-medium text-text mb-3">Delivered orders</p>
            {deliveredOrders.length === 0 ? (
              <p className="text-xs text-text-subtle">No delivered orders yet.</p>
            ) : (
              <ul className="divide-y divide-border/70 text-sm">
                {deliveredOrders.slice(0, 10).map((o) => (
                  <li key={o.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-text truncate">{o.supplyName}</p>
                      <p className="text-[11px] text-text-subtle">
                        {o.quantity} · {o.supplier} · {o.deliveredAt ? new Date(o.deliveredAt).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <Badge tone="success">Delivered</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {ordering && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setOrdering(null)}
        >
          <Card tone="raised" className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardContent className="py-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-text-subtle mb-1">Order</p>
                <h3 className="font-display text-lg text-text">{ordering.name}</h3>
                <p className="text-xs text-text-muted mt-1">
                  Current stock: {ordering.quantity} · Reorder at {ordering.reorderPoint}
                </p>
              </div>
              <FieldGroup label={`Quantity (${ordering.unit})`}>
                <Input
                  type="number"
                  min={1}
                  value={orderQty}
                  onChange={(e) => setOrderQty(Number(e.target.value) || 0)}
                  autoFocus
                />
              </FieldGroup>
              <FieldGroup label="Supplier">
                <select
                  value={orderSupplier}
                  onChange={(e) => setOrderSupplier(e.target.value)}
                  className={cn(
                    "flex w-full rounded-md border border-border-strong bg-surface px-3 h-10 text-sm text-text",
                  )}
                >
                  {SUPPLIERS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </FieldGroup>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setOrdering(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={placeOrder} disabled={orderQty <= 0}>
                  Place order
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
