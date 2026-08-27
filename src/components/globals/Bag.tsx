"use client";

import { useEffect, useState } from "react";
import { MdShoppingBag } from "react-icons/md";
import { NftId, TokenId, TransferTransaction } from "@hashgraph/sdk";
import { msToTime, toFriendlyDate } from "@erikmuir/dol-lib/utils";
import { CartItem } from "@/cart";
import { useAccountStatus } from "@/hooks/use-account-status";
import { useCart } from "@/hooks/use-cart";
import { useWalletInterface } from "@/hooks/use-wallet-interface";
import { fetchStandardJson } from "@/utils";
import type { ServerCheckoutResponse } from "@/app/api/mint/[accountId]/checkout/route";
import { DolButton } from "../common/DolButton";
import { PageNote } from "../common/PageNote";
import Modal from "./Modal";

// AC/DC Bag (CART.md checklist item: "Bag view"). Mirrors Wallet.tsx's own
// button-opens-Modal pattern exactly - same header slot, same mechanism,
// nothing new to build there.
export const Bag = () => {
  const hfbCollectionId = `${process.env.NEXT_PUBLIC_HFB_COLLECTION_ID}`;
  const { items, removeItem } = useCart();
  const { accountId, walletInterface } = useWalletInterface();
  const { mutateAccountStatus } = useAccountStatus(accountId);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [checkingOut, setCheckingOut] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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

  // Single-click auto-chain, matching Performance.tsx's current
  // handleConfirmMint/signAndFinalize pattern (CART.md: the two-click
  // split Phase 11 originally called for turned out unnecessary - Finding
  // 51 - and checkout is an even easier case, since it does no rendering
  // of its own). No modal here yet - the "Confirm Mint"-style gate is a
  // separate tracked idea (CART.md), not built as part of this pass.
  const handleCheckoutClick = async () => {
    if (!accountId || !walletInterface) {
      setNotice("Connect your wallet to check out.");
      return;
    }

    setNotice(null);
    setCheckingOut(true);
    try {
      const response = await fetchStandardJson<ServerCheckoutResponse>(
        `/api/mint/${accountId}/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((item) => ({ showDate: item.showDate, position: item.position })),
          }),
        }
      );
      const { txBytes, confirmed, expired } = response;

      // Dropped by the server's re-verification (e.g. the 15-min sweep
      // reclaimed one mid-shop) - stale either way, no reason to keep them
      // around for a retry to just fail the same way again.
      if (expired.length > 0) {
        expired.forEach((item) => removeItem(item.showDate, item.position));
        const songs = expired
          .map((item) => items.find((i) => i.showDate === item.showDate && i.position === item.position)?.song)
          .filter(Boolean)
          .join(", ");
        setNotice(`Sorry, some items expired and were removed from your bag${songs ? `: ${songs}` : "."}`);
      }

      if (!txBytes || confirmed.length === 0) {
        return;
      }

      const confirmedItems = confirmed
        .map((c) => items.find((i) => i.showDate === c.showDate && i.position === c.position))
        .filter((i): i is CartItem => i !== undefined);

      const tx = TransferTransaction.fromBytes(new Uint8Array(txBytes.data));
      const purchaseSuccess = await walletInterface.purchaseNfts(
        tx,
        confirmedItems.map((item) => ({
          nftId: new NftId(TokenId.fromString(hfbCollectionId), item.serial),
          showDate: item.showDate,
          position: item.position,
        }))
      );

      if (!purchaseSuccess) {
        // Left in the bag deliberately (Erik's call, CART.md) - nothing was
        // paid for, so nothing needs releasing, and re-preparing everything
        // from scratch over one declined wallet prompt is a harsh retry
        // cost. The 15-min sweep is still the backstop if truly abandoned.
        setNotice("Your wallet didn't confirm the transaction. Your items are still in your bag - try again anytime.");
        return;
      }

      // Same finalize step as today's single-item flow, just repeated -
      // the post-transfer route itself is unmodified (CART.md). Best-effort
      // per item: the money's already moved regardless of finalize's
      // outcome, so one item's finalize failing shouldn't block the rest.
      for (const item of confirmedItems) {
        try {
          await fetchStandardJson<boolean>(
            `/api/mint/${accountId}/${item.showDate}/${item.position}/${item.serial}`,
            { method: "POST" }
          );
        } catch (err) {
          console.error("Finalize request failed for bag item:", item, err);
        }
        removeItem(item.showDate, item.position);
      }
      // A finalized mint is also when the server consumes a whitelisted
      // account's early access (mint-gate.ts, consumeEarlyMintWhitelist) -
      // revalidate here so a still-presale second Add to Bag in this tab
      // sees the real (no longer whitelisted) state instead of a stale
      // cached one. Performance.tsx's old single-item flow did this same
      // revalidation at the equivalent point (CART.md: known gap, now fixed).
      mutateAccountStatus();
    } catch (err) {
      console.error("Checkout request failed:", err);
      setNotice("Something went wrong starting checkout. Please try again.");
    } finally {
      setCheckingOut(false);
    }
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
              <DolButton
                color="green"
                fullWidth
                disabled={checkingOut}
                onClick={handleCheckoutClick}
              >
                {checkingOut ? "Checking out..." : "Checkout"}
              </DolButton>
            </>
          )}
          {notice && (
            <PageNote color="dark" className="text-center">
              {notice}
            </PageNote>
          )}
        </div>
      </Modal>
    </div>
  );
};
