"use client";

// EMR-188 — Self-contained store cart.
//
// The new /shop surface keeps its own lightweight cart so it can ship
// end-to-end (add → checkout → compare → share) without coupling to the
// older leafmart cart shape. Lines are the minimal serializable summary
// the checkout needs; persisted to localStorage so a refresh doesn't drop
// the basket.

import * as React from "react";

export interface StoreCartLine {
  slug: string;
  name: string;
  brand: string;
  /** Unit price in dollars. */
  price: number;
  quantity: number;
  distributorId?: string;
}

interface StoreCartContextValue {
  lines: StoreCartLine[];
  itemCount: number;
  subtotal: number;
  add: (line: Omit<StoreCartLine, "quantity">, qty?: number) => void;
  setQuantity: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
}

const StoreCartContext = React.createContext<StoreCartContextValue | null>(null);

const STORAGE_KEY = "shop-cart-v1";

function readStored(): StoreCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoreCartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function StoreCartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = React.useState<StoreCartLine[]>([]);

  // Hydrate from localStorage after mount to keep SSR markup stable.
  React.useEffect(() => {
    setLines(readStored());
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* quota / private mode — cart stays in-memory only */
    }
  }, [lines]);

  const add = React.useCallback<StoreCartContextValue["add"]>((line, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.slug === line.slug);
      if (existing) {
        return prev.map((l) =>
          l.slug === line.slug ? { ...l, quantity: l.quantity + qty } : l,
        );
      }
      return [...prev, { ...line, quantity: qty }];
    });
  }, []);

  const setQuantity = React.useCallback<StoreCartContextValue["setQuantity"]>((slug, qty) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.slug !== slug)
        : prev.map((l) => (l.slug === slug ? { ...l, quantity: qty } : l)),
    );
  }, []);

  const remove = React.useCallback<StoreCartContextValue["remove"]>((slug) => {
    setLines((prev) => prev.filter((l) => l.slug !== slug));
  }, []);

  const clear = React.useCallback(() => setLines([]), []);

  const value = React.useMemo<StoreCartContextValue>(() => {
    const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    return { lines, itemCount, subtotal, add, setQuantity, remove, clear };
  }, [lines, add, setQuantity, remove, clear]);

  return <StoreCartContext.Provider value={value}>{children}</StoreCartContext.Provider>;
}

export function useStoreCart(): StoreCartContextValue {
  const ctx = React.useContext(StoreCartContext);
  if (!ctx) {
    throw new Error("useStoreCart must be used within a StoreCartProvider");
  }
  return ctx;
}

export function formatUSD(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
