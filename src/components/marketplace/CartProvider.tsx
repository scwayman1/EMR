"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getServerCart,
  setCartItemQuantity,
  removeCartItem as removeServerCartItem,
  clearServerCart,
  type ServerCartItem,
} from "@/app/(patient)/portal/shop/cart/actions";

// ── Cart item shape ─────────────────────────────────────────────────────
interface CartItemEntry {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  name: string;
}

function entryFromServer(item: ServerCartItem): CartItemEntry {
  return {
    productId: item.productId,
    variantId: item.variantId ?? undefined,
    quantity: item.quantity,
    price: item.price,
    name: item.name,
  };
}

interface CartContextValue {
  items: CartItemEntry[];
  addItem: (
    productId: string,
    variantId: string | undefined,
    price: number,
    name: string
  ) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string
  ) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const STORAGE_KEY = "leafjourney-cart";

const CartContext = createContext<CartContextValue | null>(null);

// ── Helpers ─────────────────────────────────────────────────────────────
function itemKey(productId: string, variantId?: string) {
  return variantId ? `${productId}::${variantId}` : productId;
}

function matchesItem(
  entry: CartItemEntry,
  productId: string,
  variantId?: string
) {
  return (
    entry.productId === productId && entry.variantId === variantId
  );
}

function readStorage(): CartItemEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as CartItemEntry[];
    return [];
  } catch {
    return [];
  }
}

function writeStorage(items: CartItemEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or unavailable — silently ignore.
  }
}

// ── Provider ────────────────────────────────────────────────────────────
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItemEntry[]>([]);
  const hydrated = useRef(false);
  // Authenticated patient session — server is the source of truth. Falls back
  // to localStorage-only for anon/clinician browsing.
  const persistsToServer = useRef(false);

  // Hydrate: prefer server cart (authed patient); else localStorage. If the
  // server cart is empty and localStorage has items, push them up so cross-
  // device continuity survives the first server hit.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const server = await getServerCart();
        if (cancelled) return;
        persistsToServer.current = true;
        if (server.length > 0) {
          setItems(server.map(entryFromServer));
        } else {
          const local = readStorage();
          if (local.length > 0) {
            setItems(local);
            await Promise.all(
              local.map((l) =>
                setCartItemQuantity(l.productId, l.variantId ?? null, l.quantity),
              ),
            );
          }
        }
      } catch {
        // Unauth or server error — stay in localStorage-only mode.
        setItems(readStorage());
      } finally {
        hydrated.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist to localStorage whenever items change (skip the initial default).
  // Server sync happens per-mutation below.
  useEffect(() => {
    if (hydrated.current) {
      writeStorage(items);
    }
  }, [items]);

  // Fire-and-forget server sync. Failures are logged but don't revert local
  // state — localStorage still has the truth and the next hydrate will
  // reconcile.
  const syncSet = useCallback(
    (productId: string, variantId: string | undefined, quantity: number) => {
      if (!persistsToServer.current) return;
      setCartItemQuantity(productId, variantId ?? null, quantity).catch((e) =>
        console.warn("[cart] server sync failed", e),
      );
    },
    [],
  );
  const syncRemove = useCallback(
    (productId: string, variantId: string | undefined) => {
      if (!persistsToServer.current) return;
      removeServerCartItem(productId, variantId ?? null).catch((e) =>
        console.warn("[cart] server remove failed", e),
      );
    },
    [],
  );

  const addItem = useCallback(
    (
      productId: string,
      variantId: string | undefined,
      price: number,
      name: string
    ) => {
      let nextQty = 1;
      setItems((prev) => {
        const idx = prev.findIndex((entry) =>
          matchesItem(entry, productId, variantId)
        );
        if (idx >= 0) {
          const updated = [...prev];
          nextQty = updated[idx].quantity + 1;
          updated[idx] = { ...updated[idx], quantity: nextQty };
          return updated;
        }
        return [
          ...prev,
          { productId, variantId, quantity: 1, price, name },
        ];
      });
      syncSet(productId, variantId, nextQty);
    },
    [syncSet]
  );

  const removeItem = useCallback(
    (productId: string, variantId?: string) => {
      setItems((prev) =>
        prev.filter((entry) => !matchesItem(entry, productId, variantId))
      );
      syncRemove(productId, variantId);
    },
    [syncRemove]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number, variantId?: string) => {
      if (quantity <= 0) {
        setItems((prev) =>
          prev.filter((entry) => !matchesItem(entry, productId, variantId))
        );
        syncRemove(productId, variantId);
        return;
      }
      setItems((prev) =>
        prev.map((entry) =>
          matchesItem(entry, productId, variantId)
            ? { ...entry, quantity }
            : entry
        )
      );
      syncSet(productId, variantId, quantity);
    },
    [syncSet, syncRemove]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    if (persistsToServer.current) {
      clearServerCart().catch((e) =>
        console.warn("[cart] server clear failed", e),
      );
    }
  }, []);

  const itemCount = items.reduce((sum, entry) => sum + entry.quantity, 0);
  const subtotal = items.reduce(
    (sum, entry) => sum + entry.price * entry.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────────────
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a <CartProvider>.");
  }
  return ctx;
}
