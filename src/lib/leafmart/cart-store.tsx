"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { LeafmartProduct } from "@/components/leafmart/LeafmartProductCard";

const STORAGE_KEY = "leafmart:cart:v1";

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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) dispatch({ type: "hydrate", items: parsed });
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // ignore quota errors
    }
  }, [state.items, hydrated]);

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
