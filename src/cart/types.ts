// AC/DC Bag (CART.md checklist item 6). One entry per performance the
// account has already prepare()d - serial is the real serial claimed for
// it, needed to build the checkout endpoint's request. lockedAt lets the
// bag show a per-item elapsed-lock timer, same as LockedForNote does today
// on a single performance page. song is denormalized in at add-time (the
// Performance page already knows it) purely for display - the Bag view
// would otherwise need to look each item's song back up itself.
export type CartItem = {
  showDate: string;
  position: number;
  serial: number;
  song: string;
  lockedAt?: number;
};
