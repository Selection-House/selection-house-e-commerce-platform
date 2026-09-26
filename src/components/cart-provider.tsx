"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartLine } from "@/lib/types";

type CartContextValue = { items: CartLine[]; count: number; subtotal: number; add: (item: CartLine) => void; setQuantity: (variantId: string, quantity: number) => void; remove: (variantId: string) => void; clear: () => void };
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { queueMicrotask(() => { try { setItems(JSON.parse(localStorage.getItem("selection-house-cart") || "[]")); } catch { setItems([]); } setReady(true); }); }, []);
  useEffect(() => { if (ready) localStorage.setItem("selection-house-cart", JSON.stringify(items)); }, [items, ready]);
  const value = useMemo<CartContextValue>(() => ({
    items, count: items.reduce((sum, item) => sum + item.quantity, 0), subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    add: (item) => setItems((current) => { const match = current.find((line) => line.variantId === item.variantId); if (!match) return [...current, { ...item, quantity: Math.min(item.quantity, item.stock) }]; return current.map((line) => line.variantId === item.variantId ? { ...line, quantity: Math.min(line.quantity + item.quantity, line.stock) } : line); }),
    setQuantity: (variantId, quantity) => setItems((current) => current.map((line) => line.variantId === variantId ? { ...line, quantity: Math.max(1, Math.min(quantity, line.stock)) } : line)),
    remove: (variantId) => setItems((current) => current.filter((line) => line.variantId !== variantId)), clear: () => setItems([]),
  }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() { const value = useContext(CartContext); if (!value) throw new Error("useCart must be used inside CartProvider"); return value; }
