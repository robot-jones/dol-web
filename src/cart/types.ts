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
};

export type CartItem = PendingCartItem | ReadyCartItem;
