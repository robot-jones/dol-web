import { PerformanceAttributes } from "@erikmuir/dol-lib/types";

// The customizable subset of PerformanceAttributes - the only fields
// "Update Bag Item" (CART.md) can actually change. Everything else on
// PerformanceAttributes (song/venue/mp3/etc.) is derived from the
// performance itself and never varies once claimed, so a dirty-check
// comparing the full object would be comparing fields that can't diverge.
export const CUSTOMIZABLE_ATTRIBUTE_KEYS = ["bgColor", "donut", "subject", "inscription"] as const;

// AC/DC Bag. One entry per performance the account has added to its bag -
// starts "pending" the instant Add to Bag is clicked (before any network
// call resolves, for instant feedback on the performance page - see
// add-to-bag.ts) and becomes "ready" once prepare() actually succeeds.
// song is denormalized in at add-time (the Performance page already knows
// it) purely for display - the Bag view would otherwise need to look each
// item's song back up itself.
export type PendingCartItem = {
  status: "pending";
  showDate: string;
  position: number;
  song: string;
  // Date.now() when added - the Bag view derives a display progress step
  // from this + a ticking clock, rather than something mutated on a timer.
  addedAt: number;
};

export type ReadyCartItem = {
  status: "ready";
  showDate: string;
  position: number;
  song: string;
  // The real serial claimed for it, needed to build the checkout
  // endpoint's request.
  serial: number;
  // Lets the bag show a per-item elapsed-lock timer, same as
  // LockedForNote does today on a single performance page.
  lockedAt?: number;
  // The last attributes successfully published for this item (initially
  // whatever "Add to Bag" sent, then whatever "Update Bag Item" last
  // pushed) - the dirty-check baseline the Bag compares a live draft
  // against (CartContextValue.draftAttributes) to decide whether there's
  // actually anything new to push. Optional so an item already in
  // sessionStorage from before this field existed doesn't break - it just
  // won't show an update icon until re-added.
  attributes?: PerformanceAttributes;
};

export type CartItem = PendingCartItem | ReadyCartItem;

// Shared key format for anything keyed by "which performance", so
// CartContext's draftAttributes map and its lookups (Bag.tsx) agree on the
// same string without each reimplementing the join.
export const cartItemKey = (showDate: string, position: number): string => `${showDate}:${position}`;
