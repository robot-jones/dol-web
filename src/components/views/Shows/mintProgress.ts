import { MintStatusDisplayText } from "@erikmuir/dol-lib/types";

// Approximate progress only - the pre-transfer route isn't streaming, so
// there's no real signal for when each step finishes (Finding 50). Stops
// advancing at the last message instead of looping.
export const CLAIM_PROGRESS_STEPS = [
  MintStatusDisplayText.Claiming,
  "Rendering your NFT image...",
  "Uploading to IPFS...",
  "Finalizing on-chain metadata...",
  "Almost there...",
] as const;

export const CLAIM_PROGRESS_STEP_INTERVAL_MS = 4000;
