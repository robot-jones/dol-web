"use client";

import { useEffect } from "react";
import { useCart } from "@/hooks/use-cart";
import { useWalletInterface } from "@/hooks/use-wallet-interface";
import { fetchStandardJson } from "@/utils";
import { ReadyCartItem } from "./types";

// Proactive fix (CART.md, 2026-08-27): reconcile-claims-sweep releases an
// abandoned claim server-side after ~15m, but nothing told a still-open
// tab's local cart that happened - it kept showing "In Your Bag" for
// something that's actually free again, indefinitely (found live: a
// testnet performance left open overnight, still "In Your Bag" the next
// morning). Checkout itself already re-verifies before any payment, so
// this was never a financial risk - just a stale display. This closes
// that gap proactively instead of waiting for a checkout attempt to catch
// it.
//
// Frequent enough to catch it well before someone might reasonably try to
// check out; light enough (a handful of GETs, the cart is capped at 10
// items) not to matter at this app's traffic scale.
const CHECK_INTERVAL_MS = 2 * 60 * 1000;

// Mounted once at the root layout, not tied to any one page - the whole
// point is to keep working in the background regardless of what the buyer
// is currently looking at, same reasoning as CartContext itself living
// there. Its own component rather than baked into CartContext - keeps
// CartContext itself wallet-agnostic (its own documented design), same
// reasoning as Bag.tsx pulling in useWalletInterface() alongside useCart()
// rather than the other way around.
export const CartValidator = (): null => {
  const { items, expireReadyItem } = useCart();
  const { accountId } = useWalletInterface();

  useEffect(() => {
    if (!accountId) return undefined;

    const checkReadyItems = async () => {
      const readyItems = items.filter((i): i is ReadyCartItem => i.status === "ready");
      for (const item of readyItems) {
        try {
          const performance = await fetchStandardJson<{ lockedBy?: string }>(
            `/api/performances/${item.showDate}/${item.position}`
          );
          // Not just "released" (no lockedBy) - also catches the rarer
          // case where someone else claimed it in the window between the
          // sweep releasing it and this check running.
          if (performance?.lockedBy !== accountId) {
            expireReadyItem(item.showDate, item.position, item.song);
          }
        } catch (err) {
          // Best-effort - a failed check just tries again next interval,
          // not worth surfacing as a user-facing error over a transient
          // network blip.
          console.error("Failed to re-verify bag item:", item, err);
        }
      }
    };

    checkReadyItems();
    const interval = setInterval(checkReadyItems, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
    // expireReadyItem intentionally excluded - its identity changes on
    // every CartContextProvider render (it's not memoized there) but
    // always calls through to React's own stable state setters
    // underneath, so a "stale" closure over it still behaves correctly;
    // including it would just reset this interval's timing on every
    // unrelated cart-context render (e.g. lastError changing).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, items]);

  return null;
};
