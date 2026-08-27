"use client";

import { createContext, useEffect, useState, ReactNode, Context } from "react";
import { CartItem } from "./types";

const STORAGE_KEY = "dol-cart";
// Hedera Token Service's own per-transfer NFT limit - matches
// MAX_CONCURRENT_LOCKS in dol-lib's claimPerformance and the checkout
// endpoint's own MAX_CHECKOUT_ITEMS. Exported so the "Add to Bag" button
// (Performance.tsx) can refuse locally, before ever calling prepare,
// instead of claiming a real performance server-side only to have nowhere
// local to put it.
export const MAX_CART_ITEMS = 10;

export type CartContextValue = {
  items: CartItem[];
  // Returns false (no-op) if the item's already in the bag or the bag is
  // full - lets the caller show feedback without the context throwing.
  addItem: (item: CartItem) => boolean;
  removeItem: (showDate: string, position: number) => void;
  clear: () => void;
};

const defaultContext: CartContextValue = {
  items: [],
  addItem: () => false,
  removeItem: () => {},
  clear: () => {},
};

export const CartContext: Context<CartContextValue> = createContext(defaultContext);

// Cart state is deliberately client-only, not a new server-tracked entity
// (CART.md checklist item 6) - the per-performance `lockedBy` field, re-
// verified at checkout, is already the real source of truth for "what does
// this account have reserved." sessionStorage rather than localStorage:
// losing the bag on tab close is an accepted gap (same as today's single-
// item preparedTx not surviving a reload), and sessionStorage avoids a
// stale bag silently reappearing days later with items that may have sold
// or expired long since.
export const CartContextProvider = (props: {
  children: ReactNode | undefined;
}) => {
  const [items, setItems] = useState<CartItem[]>(defaultContext.items);
  // Reading sessionStorage has to happen in an effect, not the useState
  // initializer - it's unavailable during SSR, and seeding real data into
  // the initializer would mismatch the server-rendered empty state.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch (err) {
      console.error("Failed to read cart from sessionStorage:", err);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return; // don't clobber storage with the pre-hydration empty state
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error("Failed to persist cart to sessionStorage:", err);
    }
  }, [items, hydrated]);

  // Functional setItems throughout, not the plain-value form - addItem in
  // particular has to stay correct even when called more than once before
  // a re-render (React 18 batches synchronous calls), or a fast add
  // sequence could silently drop items past the closure's stale snapshot.
  const addItem = (item: CartItem): boolean => {
    const alreadyIn = items.some(
      (i) => i.showDate === item.showDate && i.position === item.position
    );
    if (alreadyIn || items.length >= MAX_CART_ITEMS) return false;
    setItems((prev) => {
      if (prev.some((i) => i.showDate === item.showDate && i.position === item.position)) {
        return prev;
      }
      if (prev.length >= MAX_CART_ITEMS) return prev;
      return [...prev, item];
    });
    return true;
  };

  const removeItem = (showDate: string, position: number) => {
    setItems((prev) => prev.filter((i) => !(i.showDate === showDate && i.position === position)));
  };

  const clear = () => setItems([]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clear }}>
      {props.children}
    </CartContext.Provider>
  );
};
