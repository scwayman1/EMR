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

// ── Cart item shape ─────────────────────────────────────────────────────
interface CartItemEntry {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  name: string;
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

  // Hydrate from localStorage on mount
  useEffect(() => {
    setItems(readStorage());
    hydrated.current = true;
  }, []);

  // Persist to localStorage whenever items change (skip the initial default)
  useEffect(() => {
    if (hydrated.current) {
      writeStorage(items);
    }
  }, [items]);

  const addItem = useCallback(
    (
      productId: string,
      variantId: string | undefined,
      price: number,
      name: string
    ) => {
      setItems((prev) => {
        const idx = prev.findIndex((entry) =>
          matchesItem(entry, productId, variantId)
        );
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            quantity: updated[idx].quantity + 1,
          };
          return updated;
        }
        return [
          ...prev,
          { productId, variantId, quantity: 1, price, name },
        ];
      });
    },
    []
  );

  const removeItem = useCallback(
    (productId: string, variantId?: string) => {
      setItems((prev) =>
        prev.filter((entry) => !matchesItem(entry, productId, variantId))
      );
    },
    []
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number, variantId?: string) => {
      if (quantity <= 0) {
        setItems((prev) =>
          prev.filter((entry) => !matchesItem(entry, productId, variantId))
        );
        return;
      }
      setItems((prev) =>
        prev.map((entry) =>
          matchesItem(entry, productId, variantId)
            ? { ...entry, quantity }
            : entry
        )
      );
    },
    []
  );

  const clearCart = useCallback(() => {
    setItems([]);
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
