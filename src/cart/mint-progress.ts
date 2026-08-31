import { MintStatusDisplayText } from "@erikmuir/dol-lib/types";

// Approximate progress only - the pre-transfer route isn't streaming, so
// there's no real signal for when each step finishes (Finding 50). Stops
// advancing at the last message instead of looping. Moved here from
// Performance/mintProgress.ts when the spinner/progress display moved
// into the Bag view (CART.md) - the underlying prepare() chain these
// describe is unchanged, still claim -> render -> upload -> finalize.
export const CLAIM_PROGRESS_STEPS = [
  MintStatusDisplayText.Claiming,
  "Rendering your NFT image...",
  "Uploading to IPFS...",
  "Finalizing on-chain metadata...",
  "Almost there...",
] as const;

export const CLAIM_PROGRESS_STEP_INTERVAL_MS = 4000;

// "Update Attributes" (CART.md) reuses the same claim -> render -> upload
// -> finalize progress display for an already-claimed item's re-publish -
// minus the first step, since nothing is being (re-)claimed. Sliced rather
// than duplicated so the wording stays in sync automatically.
export const UPDATE_PROGRESS_STEPS = CLAIM_PROGRESS_STEPS.slice(1);

// Derives which step a pending item's progress display should show, from
// how long it's been pending - the Bag view already has a ticking clock
// (`now`) for LockedForNote-style timers, so this reuses that instead of
// a second per-item interval/mutation. `stepCount` defaults to
// CLAIM_PROGRESS_STEPS's own length; pass UPDATE_PROGRESS_STEPS.length for
// an in-flight update instead.
export const getProgressStepIndex = (
  addedAt: number,
  now: number,
  stepCount: number = CLAIM_PROGRESS_STEPS.length
): number => {
  const elapsed = Math.max(0, now - addedAt);
  const step = Math.floor(elapsed / CLAIM_PROGRESS_STEP_INTERVAL_MS);
  return Math.min(step, stepCount - 1);
};
