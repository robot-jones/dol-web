"use client";

import { useEffect, useState } from "react";
import { MdShoppingBag } from "react-icons/md";
import { msToTime, toFriendlyDate } from "@erikmuir/dol-lib/utils";
import { CartItem } from "@/cart";
import { useCart } from "@/hooks/use-cart";
import { useWalletInterface } from "@/hooks/use-wallet-interface";
import { fetchStandardJson } from "@/utils";
import { DolButton } from "../common/DolButton";
import { PageNote } from "../common/PageNote";
import Modal from "./Modal";

// AC/DC Bag (CART.md checklist item: "Bag view"). Mirrors Wallet.tsx's own
// button-opens-Modal pattern exactly - same header slot, same mechanism,
// nothing new to build there.
export const Bag = () => {
  const { items, removeItem } = useCart();
  const { accountId } = useWalletInterface();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Only ticking while the bag is actually open - no point re-rendering a
  // closed modal's contents once a second.
  useEffect(() => {
    if (!open) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [open]);

  const handleBagClick = () => setOpen(!open);
  const handleClose = () => setOpen(false);

  // Clears local cart state immediately (optimistic, same pattern as
  // Performance.tsx's handleReleaseClick) and releases the server-side
  // claim best-effort in the background - useCart itself never made this
  // call, so Remove used to silently leave the performance locked for
  // whoever clicked it until the 15-minute sweep caught it. The abort
  // route always responds success regardless of outcome (it's designed to
  // be safe to call more than once, or too late), so there's nothing
  // meaningful to surface back to the user either way - this is purely
  // best-effort cleanup, not something the UI needs to wait on.
  const handleRemoveClick = (item: CartItem) => {
    removeItem(item.showDate, item.position);
    if (!accountId) return; // no session to release under - the sweep will still catch it
    fetchStandardJson(
      `/api/mint/${accountId}/${item.showDate}/${item.position}/${item.serial}/abort`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "USER_CANCELLED" }),
      }
    ).catch((err) => console.error("Failed to release bag item's claim:", err));
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="AC/DC Bag"
        onClick={handleBagClick}
        className="relative p-1 bg-transparent border-0 text-dol-light hover:text-white duration-500"
      >
        <MdShoppingBag size={24} />
        {items.length > 0 && (
          <span
            className={
              "absolute -top-1 -right-1 flex items-center justify-center " +
              "min-w-[1.1rem] h-[1.1rem] px-1 rounded-full " +
              "text-[0.65rem] font-bold text-white bg-dol-red"
            }
          >
            {items.length}
          </span>
        )}
      </button>
      <Modal
        id="bag"
        show={open}
        onClose={handleClose}
        title="AC/DC Bag"
        showClose
        ariaLabel="AC/DC Bag"
        className="justify-end items-start pt-10"
      >
        <div className="flex flex-col gap-3 w-72">
          {items.length === 0 ? (
            <div className="text-sm text-gray-medium text-center">Your bag is empty.</div>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {items.map((item) => (
                  <li
                    key={`${item.showDate}:${item.position}`}
                    className="flex items-start justify-between gap-2 border-b border-gray-dark pb-2"
                  >
                    <div>
                      <div className="text-sm">{item.song}</div>
                      <div className="text-xs text-gray-medium">{toFriendlyDate(item.showDate)}</div>
                      {item.lockedAt && (
                        <div className="text-xs text-gray-medium">
                          Locked for {msToTime(now - item.lockedAt)}
                        </div>
                      )}
                    </div>
                    <DolButton
                      size="sm"
                      color="gray"
                      outline
                      onClick={() => handleRemoveClick(item)}
                    >
                      Remove
                    </DolButton>
                  </li>
                ))}
              </ul>
              <DolButton color="green" fullWidth disabled>Checkout</DolButton>
              <PageNote color="dark" className="text-center">
                Checkout is coming soon - for now this is just your bag.
              </PageNote>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
