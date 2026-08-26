// AC/DC Bag (CART.md checklist item 6). One entry per performance the
// account has already prepare()d - serial is the real serial claimed for
// it, needed to build the checkout endpoint's request. lockedAt lets the
// bag show a per-item elapsed-lock timer, same as LockedForNote does today
// on a single performance page.
export type CartItem = {
  showDate: string;
  position: number;
  serial: number;
  lockedAt?: number;
};
