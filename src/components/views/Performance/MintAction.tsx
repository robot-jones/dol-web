"use client";

import { useEffect, useState } from "react";
import { CollectionMintStatus, PerformanceAttributes } from "@erikmuir/dol-lib/types";
import { addToBag, MAX_CART_ITEMS } from "@/cart";
import { MintActionColor, MintActionPill } from "@/components/common/MintActionPill";
import { DolButton } from "@/components/common/DolButton";
import { Modal } from "@/components/globals/Modal";
import { LockedForNote } from "@/components/views/Performance/LockedForNote";
import { useCart } from "@/hooks/use-cart";
import { useIsTokenAssociated } from "@/hooks/use-mirror";
import { fetchStandardJson } from "@/utils";
import { openWalletConnectModal } from "@/wallet";
import type { WalletInterface } from "@/wallet/wallet-interface";

// AC/DC Bag intro modal (CART.md): shown once ever per browser, not once
// per empty bag - localStorage rather than sessionStorage, since the
// explanation itself never goes stale the way cart items can (that's
// specifically why cart state uses sessionStorage instead).
const BAG_INTRO_SEEN_KEY = "dol-bag-intro-seen";

export type MintActionProps = {
  showDate: string;
  position: number;
  // Performance state - owned by usePerformance in Performance.tsx, since
  // metadata/randomize/etc. there need it too, not just this component.
  performanceLoading: boolean;
  serial?: number;
  lockedBy?: string;
  lockedAt?: number;
  mutatePerformance: () => void;
  // What Add to Bag publishes if clicked.
  attributes: PerformanceAttributes;
  pageLoaded: boolean;
  hasSetlist: boolean;
  // Wallet - accountId is also needed by Performance.tsx's own
  // useAccountStatus call, so it's passed down rather than re-derived here.
  accountId: string | null;
  walletInterface: WalletInterface | null;
  // Account status - shared with InactiveMintNote in Performance.tsx, so
  // computed once there rather than duplicating the hook call here.
  accountStatusLoading: boolean;
  isBlocked: boolean;
  isWhitelisted: boolean;
  // Collection status - shared with InactiveMintNote, same reasoning.
  appConfigStatusLoading: boolean;
  collectionMintStatus?: CollectionMintStatus;
};

// Single source of truth for both the pill's color/label (replacing
// MintStatusBanner) and whether it's actually clickable (replacing
// getMintButton) - same branch order/conditions the old getMintButton
// used, so behavior is unchanged, just no longer split across two
// independent state machines. `extra` is secondary UI (Release button,
// "locked for" note, associate error) that doesn't fit inside a single
// pill and renders below it.
type Action = {
  color: MintActionColor;
  label: string;
  onClick?: () => void;
  extra?: React.ReactNode;
};

// Extracted from Performance.tsx (CART.md) - everything about deciding
// and rendering the mint/add-to-bag control, including the one-time bag
// intro modal it can trigger, now lives in one place. cart state and
// token-association status are pulled in directly here (useCart,
// useIsTokenAssociated) rather than passed as props, since nothing else
// on the page needs them any more - unlike accountStatus/appConfigStatus,
// which InactiveMintNote also needs and so stay owned by Performance.tsx.
export const MintAction = ({
  showDate,
  position,
  performanceLoading,
  serial,
  lockedBy,
  lockedAt,
  mutatePerformance,
  attributes,
  pageLoaded,
  hasSetlist,
  accountId,
  walletInterface,
  accountStatusLoading,
  isBlocked,
  isWhitelisted,
  appConfigStatusLoading,
  collectionMintStatus,
}: MintActionProps): React.ReactNode => {
  const hfbCollectionId = `${process.env.NEXT_PUBLIC_HFB_COLLECTION_ID}`;
  const hbarPrice = process.env.NEXT_PUBLIC_HFB_HBAR_PRICE || "46";

  const cart = useCart();
  const { items: bagItems, removeItem: removeBagItem } = cart;
  const { isAssociated, isAssociatedLoading, mutateIsAssociated } = useIsTokenAssociated(hfbCollectionId, accountId);

  const [now, setNow] = useState(Date.now());
  const [releasingClaim, setReleasingClaim] = useState(false);
  const [associateError, setAssociateError] = useState(false);
  const [showBagIntro, setShowBagIntro] = useState(false);

  const bagEntry = bagItems.find((i) => i.showDate === showDate && i.position === position);
  const isConnected = Boolean(accountId);
  const maxCartItems = collectionMintStatus === CollectionMintStatus.PRE_SALE ? 1 : MAX_CART_ITEMS;

  // Ticks `now` while this performance is locked (by anyone) or in this
  // account's own bag, so the elapsed-time note stays live without
  // needing a network refetch - lockedAt is a fixed timestamp, only "now"
  // needs to move.
  //
  // Bug fixed 2026-08-27 (CART.md): gating on lockedBy alone left `now`
  // stuck stale relative to a fresh bagEntry.lockedAt whenever SWR hadn't
  // caught up yet - "Locked for -1:-16". Gating on bagEntry too, and
  // setting `now` immediately when the effect (re)starts rather than
  // waiting for the first 1s tick, closes both gaps.
  useEffect(() => {
    if (!lockedBy && !bagEntry) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [lockedBy, bagEntry]);

  const handleConnectClick = () => {
    openWalletConnectModal();
  };

  const handleAssociateClick = async () => {
    setAssociateError(false);
    try {
      const success = await walletInterface?.associateToken(hfbCollectionId);
      if (success) {
        mutateIsAssociated(true);
      } else {
        setAssociateError(true);
      }
    } catch {
      setAssociateError(true);
    }
  };

  // Self-service release (Finding 52) - safe regardless of any wallet
  // activity elsewhere, since releaseClaim itself verifies on-chain
  // ownership before releasing anything. Also drops the item from the
  // bag, if it's there - otherwise the bag would keep showing an entry
  // for a claim that's no longer actually locked. The abort route always
  // responds success regardless of outcome, so the revalidation below is
  // what surfaces the true result either way.
  const handleReleaseClick = async () => {
    if (!lockedBy) return;

    setReleasingClaim(true);
    try {
      await fetchStandardJson(
        `/api/mint/${accountId}/${showDate}/${position}/0/abort`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "USER_CANCELLED" }),
        }
      );
    } catch (err) {
      console.error("Release request failed:", err);
    } finally {
      setReleasingClaim(false);
      removeBagItem(showDate, position);
      mutatePerformance();
    }
  };

  // AC/DC Bag hard cutover (CART.md), instant-add revision: the single-item
  // Mint flow is gone - this is now the only purchase-adjacent action a
  // performance page offers, and it no longer waits on anything. A pending
  // entry lands in the bag synchronously (see addToBag in @/cart), so the
  // pill flips to "In Your Bag" immediately - no spinner or progress text
  // on this page any more, that all moved into the Bag view, which can
  // track multiple in-flight adds independently and survives navigation.
  // The old "Confirm Mint" modal moved to Checkout - what gates this
  // click now is the one-time bag-intro modal below, not a per-click
  // confirmation.
  const handleAddToBagClick = () => {
    if (!pageLoaded || !hasSetlist || !accountId) {
      return;
    }
    // Both of these are guarded here too, but shouldn't normally be
    // reachable - getAction below only wires this handler up once
    // neither condition holds, so hitting either here would mean stale
    // SWR/cart data at click time (rare race, not the common path).
    if (serial) {
      return;
    }
    if (bagItems.length >= maxCartItems) {
      return;
    }
    // Only gated the very first time ever, per browser - not re-checked
    // against current bag contents, so it can't get re-triggered just
    // because someone emptied their bag out via a completed checkout.
    let seenIntro = true;
    try {
      seenIntro = Boolean(localStorage.getItem(BAG_INTRO_SEEN_KEY));
    } catch (err) {
      console.error("Failed to read bag-intro-seen flag:", err);
    }
    if (seenIntro) {
      addToBag(cart, accountId, showDate, position, attributes);
    } else {
      setShowBagIntro(true);
    }
  };

  const handleBagIntroCancel = () => setShowBagIntro(false);

  const handleBagIntroOk = () => {
    setShowBagIntro(false);
    try {
      localStorage.setItem(BAG_INTRO_SEEN_KEY, "true");
    } catch (err) {
      console.error("Failed to persist bag-intro-seen flag:", err);
    }
    if (accountId) {
      addToBag(cart, accountId, showDate, position, attributes);
    }
  };

  const getAction = (): Action => {
    // Loading
    if (appConfigStatusLoading || performanceLoading || isAssociatedLoading || accountStatusLoading) {
      return { color: "gray", label: "Checking availability…" };
    }

    // Minted
    if (serial) {
      return { color: "red", label: `Already in Someone's Stash · #${serial}` };
    }

    // Not connected
    if (!isConnected) {
      return { color: "blue", label: `Mint: ${hbarPrice} ℏ`, onClick: handleConnectClick };
    }

    // Not associated
    if (!isAssociated) {
      return {
        color: "blue",
        label: "Associate The Token",
        onClick: handleAssociateClick,
        extra: associateError ? (
          <div className="text-xs text-dol-red text-center">
            Failed to associate token. Please try again.
          </div>
        ) : null,
      };
    }

    // Blocked
    if (isBlocked) {
      return { color: "gray", label: "Minting Unavailable" };
    }

    // In the bag
    if (bagEntry) {
      return {
        color: "yellow",
        label: "In Your Bag",
        extra: bagEntry.status === "ready" ? (
          <div className="flex flex-col items-center">
            <LockedForNote lockedAt={bagEntry.lockedAt} now={now} />
          </div>
        ) : null,
      };
    }

    // Locked
    if (lockedBy) {
      const isOwnLock = lockedBy === accountId;
      return {
        color: "yellow",
        label: isOwnLock ? "In Your Bag" : "Someone's Claiming This",
        extra: (
          <div className="flex flex-col items-center gap-2">
            {isOwnLock && (
              <DolButton
                size="sm"
                color="red"
                outline
                roundedFull
                onClick={handleReleaseClick}
                disabled={releasingClaim}
              >
                {releasingClaim ? "Releasing..." : "Release"}
              </DolButton>
            )}
            <LockedForNote lockedAt={lockedAt} now={now} />
          </div>
        ),
      };
    }

    // Bag is full
    if (bagItems.length >= maxCartItems) {
      return { color: "gray", label: `Your Bag is Full (${maxCartItems} max)` };
    }

    // Handle mint statuses
    switch (collectionMintStatus) {
      case CollectionMintStatus.PRE_SALE:
        return isWhitelisted
          ? { color: "green", label: `Add to Bag · ${hbarPrice} ℏ`, onClick: handleAddToBagClick }
          : { color: "gray", label: "Public Mint: 9/4" };
      case CollectionMintStatus.PAUSED:
        return { color: "gray", label: "Minting is currently Paused" };
      case CollectionMintStatus.SOLD_OUT:
        return { color: "gray", label: "Sold Out" };
      case CollectionMintStatus.CLOSED:
        return { color: "gray", label: "Minting has Closed" };
      case CollectionMintStatus.OPEN:
        return { color: "green", label: `Add to Bag · ${hbarPrice} ℏ`, onClick: handleAddToBagClick };
      default:
        throw new Error(`Unsupported CollectionMintStatus: '${collectionMintStatus}'`);
    }
  };

  const action = getAction();

  return (
    <>
      <MintActionPill color={action.color} label={action.label} onClick={action.onClick} />
      {action.extra}
      <Modal
        id="bag-intro"
        show={showBagIntro}
        onClose={handleBagIntroCancel}
        title="Your AC/DC Bag"
        dim
      >
        <div className="flex flex-col gap-4 w-64 text-center">
          <div className="text-balance">
            Add up to 10 performances to your bag, then check out once to mint them all together.
          </div>
          <div className="text-xs text-gray-medium">
            Adding something to your bag locks it and starts generating your NFT right away, so it&apos;s reserved for you. If you don&apos;t check out, it auto-releases within ~15m.
          </div>
          <div className="flex flex-col gap-3">
            <DolButton color="green" fullWidth onClick={handleBagIntroOk}>OK</DolButton>
            <DolButton color="gray" outline fullWidth onClick={handleBagIntroCancel}>Cancel</DolButton>
          </div>
        </div>
      </Modal>
    </>
  );
};
