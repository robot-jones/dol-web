"use client";

import { createContext, useEffect, useRef, useState, ReactNode, Context } from "react";
import { CartItem, PendingCartItem, ReadyCartItem } from "./types";

const STORAGE_KEY = "dol-cart";
// Hedera Token Service's own per-transfer NFT limit - matches
// MAX_CONCURRENT_LOCKS in dol-lib's claimPerformance and the checkout
// endpoint's own MAX_CHECKOUT_ITEMS. Exported so the "Add to Bag" button
// (Performance.tsx) can refuse locally, before ever calling prepare,
// instead of claiming a real performance server-side only to have nowhere
// local to put it.
export const MAX_CART_ITEMS = 10;

const findIndex = (items: CartItem[], showDate: string, position: number) =>
  items.findIndex((i) => i.showDate === showDate && i.position === position);

export type CartContextValue = {
  items: CartItem[];
  // Adds a "pending" placeholder immediately, synchronously - before any
  // network call - so the performance page can show instant feedback
  // instead of waiting on prepare() to resolve (see add-to-bag.ts).
  // Returns false (no-op) if it's already in the bag in any status, or
  // the bag is full.
  addPendingItem: (showDate: string, position: number, song: string) => boolean;
  // Replaces a pending item with its resolved, ready form once prepare()
  // actually succeeds. No-op if the item isn't there (e.g. already
  // removed) or isn't pending any more.
  resolvePendingItem: (showDate: string, position: number, serial: number, lockedAt?: number) => void;
  // Drops a pending item that failed to prepare and records why, so the
  // bag can surface it if it's open. Deliberately not a persistent
  // per-item error row - see lastError below.
  failPendingItem: (showDate: string, position: number, message: string) => void;
  // Most recent add-to-bag failure, if any - a single slot, not a list.
  // Cleared explicitly (e.g. when the bag closes) rather than timing out
  // on its own, so it's not missed if the bag wasn't open when it happened.
  lastError: string | null;
  clearLastError: () => void;
  removeItem: (showDate: string, position: number) => void;
  clear: () => void;
  // Drops a "ready" item that a background re-check (CartValidator) found
  // is no longer actually locked by this account - e.g. reconcile-claims-
  // sweep released it server-side while this tab sat open. Distinct from
  // failPendingItem: that one only ever removes a still-*pending* item
  // (an add that never finished); this one only removes an already-*ready*
  // one (an add that finished, then later stopped being true). Also
  // records why via lastError, same as failPendingItem.
  expireReadyItem: (showDate: string, position: number, song: string) => void;
  // Lets something outside the Bag (Add to Bag on a performance page) ask
  // it to open itself - a counter, not a boolean, since Bag.tsx already
  // owns its own open/closed state (and all the reasons it closes itself -
  // checkout, navigation, etc.); this is purely a one-way "please open"
  // signal it listens for, not shared open/closed state. Starts at 0,
  // meaning "never requested" - Bag.tsx only reacts to it increasing past
  // that, so mounting doesn't itself count as a request.
  bagOpenRequestCount: number;
  requestBagOpen: () => void;
};

const defaultContext: CartContextValue = {
  items: [],
  addPendingItem: () => false,
  resolvePendingItem: () => {},
  failPendingItem: () => {},
  lastError: null,
  clearLastError: () => {},
  removeItem: () => {},
  clear: () => {},
  expireReadyItem: () => {},
  bagOpenRequestCount: 0,
  requestBagOpen: () => {},
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
  const [items, setItemsState] = useState<CartItem[]>(defaultContext.items);
  // Synchronous mirror of `items`, updated by every mutator below via the
  // local setItems() wrapper. React's own setState (setItemsState) is what
  // actually drives re-rendering, but its functional-updater form only
  // runs once React gets around to processing the queued update - it's
  // not guaranteed to have happened yet by the time a second mutator call
  // fires in the same tick (e.g. two near-simultaneous "Add to Bag"
  // clicks). itemsRef is always current the instant a mutator returns, so
  // a guard check like addPendingItem's capacity/duplicate check can trust
  // it. Bug fixed 2026-08-28 (CART.md): addPendingItem's own pre-check
  // used to read the `items` render closure directly and could report
  // `true` right at the MAX_CART_ITEMS boundary even when the actual
  // functional update silently rejected the add underneath it - the
  // caller (add-to-bag.ts) would then still call prepare() for real,
  // claiming and rendering a performance with nowhere local to land it.
  const itemsRef = useRef<CartItem[]>(defaultContext.items);
  const [lastError, setLastError] = useState<string | null>(null);
  const [bagOpenRequestCount, setBagOpenRequestCount] = useState(0);
  // Reading sessionStorage has to happen in an effect, not the useState
  // initializer - it's unavailable during SSR, and seeding real data into
  // the initializer would mismatch the server-rendered empty state.
  const [hydrated, setHydrated] = useState(false);

  const setItems = (next: CartItem[]) => {
    itemsRef.current = next;
    setItemsState(next);
  };

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: CartItem[] = JSON.parse(stored);
        const ready = parsed.filter((item): item is ReadyCartItem => item.status === "ready");
        // A "pending" item means a prepare() call was in flight when the
        // tab closed or reloaded - that promise chain is gone with the old
        // page, nothing left to resolve it, and it would otherwise spin
        // forever. Dropped rather than reconciled against the server: the
        // underlying claim (if it actually landed) is still real and the
        // 15-min sweep still cleans it up if abandoned - same accepted gap
        // as reload-loses-cart generally, not a new one. Surfaced via
        // lastError now (2026-08-28) rather than dropped silently, so a
        // reload mid-add doesn't just make the item vanish with no
        // explanation - the affected performance page's own lockedBy
        // fallback is still the actual recovery path.
        setItems(ready);
        const interrupted = parsed.length - ready.length;
        if (interrupted > 0) {
          setLastError(
            `${interrupted} item${interrupted === 1 ? "" : "s"} you were adding got interrupted by the reload - ` +
            (interrupted === 1
              ? "revisit its performance page to see if it locked for you."
              : "revisit their performance pages to see if they locked for you.")
          );
        }
      }
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

  const addPendingItem = (showDate: string, position: number, song: string): boolean => {
    const current = itemsRef.current;
    if (findIndex(current, showDate, position) !== -1 || current.length >= MAX_CART_ITEMS) {
      return false;
    }
    const pending: PendingCartItem = { status: "pending", showDate, position, song, addedAt: Date.now() };
    setItems([...current, pending]);
    return true;
  };

  const resolvePendingItem = (showDate: string, position: number, serial: number, lockedAt?: number) => {
    const current = itemsRef.current;
    const index = findIndex(current, showDate, position);
    if (index === -1 || current[index].status !== "pending") return;
    const ready: ReadyCartItem = {
      status: "ready",
      showDate,
      position,
      song: current[index].song,
      serial,
      lockedAt,
    };
    const next = [...current];
    next[index] = ready;
    setItems(next);
  };

  const failPendingItem = (showDate: string, position: number, message: string) => {
    const current = itemsRef.current;
    const index = findIndex(current, showDate, position);
    if (index !== -1 && current[index].status === "pending") {
      setItems(current.filter((_, i) => i !== index));
    }
    setLastError(message);
  };

  const clearLastError = () => setLastError(null);

  const removeItem = (showDate: string, position: number) => {
    setItems(itemsRef.current.filter((i) => !(i.showDate === showDate && i.position === position)));
  };

  const clear = () => setItems([]);

  const expireReadyItem = (showDate: string, position: number, song: string) => {
    const current = itemsRef.current;
    const index = findIndex(current, showDate, position);
    if (index !== -1 && current[index].status === "ready") {
      setItems(current.filter((_, i) => i !== index));
    }
    setLastError(`${song} was removed from your bag - it's no longer reserved for you.`);
  };

  const requestBagOpen = () => setBagOpenRequestCount((prev) => prev + 1);

  return (
    <CartContext.Provider
      value={{
        items,
        addPendingItem,
        resolvePendingItem,
        failPendingItem,
        lastError,
        clearLastError,
        removeItem,
        clear,
        expireReadyItem,
        bagOpenRequestCount,
        requestBagOpen,
      }}
    >
      {props.children}
    </CartContext.Provider>
  );
};
