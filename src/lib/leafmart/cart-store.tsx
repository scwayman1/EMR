"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { LeafmartProduct } from "@/components/leafmart/LeafmartProductCard";

const STORAGE_KEY = "leafmart:cart:v1";

/**
 * Merge two carts. For items present in both, take the higher quantity —
 * the user explicitly added them in two places, so we honor the larger
 * intent. Prefer the local product object since it was just rendered by
 * the page (the server's mapped product might lag UI-column updates).
 */
function mergeCarts(local: CartItem[], server: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const item of local) map.set(item.product.slug, item);
  for (const item of server) {
    const existing = map.get(item.product.slug);
    if (existing) {
      map.set(item.product.slug, {
        product: existing.product,
        quantity: Math.max(existing.quantity, item.quantity),
      });
    } else {
      map.set(item.product.slug, item);
    }
  }
  return [...map.values()];
}

function readLocalStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export interface CartItem {
  product: LeafmartProduct;
  quantity: number;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "hydrate"; items: CartItem[] }
  | { type: "addItem"; product: LeafmartProduct; quantity?: number }
  | { type: "removeItem"; slug: string }
  | { type: "updateQuantity"; slug: string; quantity: number }
  | { type: "clearCart" };

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return { items: action.items };
    case "addItem": {
      const qty = action.quantity ?? 1;
      const existing = state.items.find((i) => i.product.slug === action.product.slug);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.slug === action.product.slug
              ? { ...i, quantity: i.quantity + qty }
              : i
          ),
        };
      }
      return { items: [...state.items, { product: action.product, quantity: qty }] };
    }
    case "removeItem":
      return { items: state.items.filter((i) => i.product.slug !== action.slug) };
    case "updateQuantity": {
      if (action.quantity <= 0) {
        return { items: state.items.filter((i) => i.product.slug !== action.slug) };
      }
      return {
        items: state.items.map((i) =>
          i.product.slug === action.slug ? { ...i, quantity: action.quantity } : i
        ),
      };
    }
    case "clearCart":
      return { items: [] };
    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: LeafmartProduct, quantity?: number) => void;
  removeItem: (slug: string) => void;
  updateQuantity: (slug: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [] } as CartState);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // null = unknown, false = anonymous, true = authed (server sync enabled)
  const [authed, setAuthed] = useState<boolean | null>(null);
  // Skip the very first server-POST after hydration completes — the merge
  // pass already wrote the canonical state.
  const skipNextServerSync = useRef(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. Optimistic hydrate from localStorage so the UI paints fast.
      const local = readLocalStorage();
      if (local.length) dispatch({ type: "hydrate", items: local });

      // 2. Probe auth via the existing /me endpoint.
      let isAuthed = false;
      try {
        const r = await fetch("/api/leafmart/me");
        if (r.ok) {
          const j = (await r.json()) as { user: { id: string } | null };
          isAuthed = j.user !== null;
        }
      } catch {
        /* offline or build-time: stay anonymous */
      }
      if (cancelled) return;

      if (!isAuthed) {
        setAuthed(false);
        setHydrated(true);
        return;
      }

      // 3. Authed: GET server cart, merge, dispatch the union.
      let serverItems: CartItem[] = [];
      try {
        const r = await fetch("/api/leafmart/cart");
        if (r.ok) {
          const j = (await r.json()) as { items?: CartItem[] };
          serverItems = j.items ?? [];
        }
      } catch {
        /* server hiccup: fall back to local-only for this session */
      }
      if (cancelled) return;

      const merged = mergeCarts(local, serverItems);
      dispatch({ type: "hydrate", items: merged });

      // 4. POST the merged result so the server reflects the union too.
      // Don't await — UI doesn't need to wait on this.
      void fetch("/api/leafmart/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: merged.map((it) => ({
            slug: it.product.slug,
            quantity: it.quantity,
          })),
        }),
      }).catch(() => {});

      setAuthed(true);
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist every state change to localStorage and (if authed) the server.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // ignore quota errors
    }

    if (skipNextServerSync.current) {
      skipNextServerSync.current = false;
      return;
    }
    if (authed !== true) return;

    void fetch("/api/leafmart/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: state.items.map((it) => ({
          slug: it.product.slug,
          quantity: it.quantity,
        })),
      }),
    })
      .then((r) => {
        // Session expired between requests — drop into anonymous mode so
        // we don't keep retrying every mutation.
        if (r.status === 401) setAuthed(false);
      })
      .catch(() => {
        /* network blip: localStorage still has the truth */
      });
  }, [state.items, hydrated, authed]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((v) => !v), []);

  const addItem = useCallback(
    (product: LeafmartProduct, quantity?: number) => {
      dispatch({ type: "addItem", product, quantity });
      setIsOpen(true);
    },
    []
  );
  const removeItem = useCallback((slug: string) => dispatch({ type: "removeItem", slug }), []);
  const updateQuantity = useCallback(
    (slug: string, quantity: number) => dispatch({ type: "updateQuantity", slug, quantity }),
    []
  );
  const clearCart = useCallback(() => dispatch({ type: "clearCart" }), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = state.items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = state.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
    return {
      items: state.items,
      itemCount,
      subtotal,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    };
  }, [
    state.items,
    isOpen,
    openCart,
    closeCart,
    toggleCart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

export function formatUSD(cents: number): string {
  return `$${cents.toFixed(2)}`;
}
