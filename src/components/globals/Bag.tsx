"use client";

import { useEffect, useState } from "react";
import { MdShoppingBag } from "react-icons/md";
import { msToTime, toFriendlyDate } from "@erikmuir/dol-lib/utils";
import { useCart } from "@/hooks/use-cart";
import { DolButton } from "../common/DolButton";
import { PageNote } from "../common/PageNote";
import Modal from "./Modal";

// AC/DC Bag (CART.md checklist item: "Bag view"). Mirrors Wallet.tsx's own
// button-opens-Modal pattern exactly - same header slot, same mechanism,
// nothing new to build there.
export const Bag = () => {
  const { items, removeItem } = useCart();
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

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="AC/DC Bag"
        onClick={handleBagClick}
        className="relative p-1 text-dol-light hover:text-white duration-500"
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
                      onClick={() => removeItem(item.showDate, item.position)}
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
