import { useMemo } from "react";
import { DolPerformance } from "@erikmuir/dol-lib/types";
import { AnimatedDonut } from "@/components/common/AnimatedDonut";

// Gray isn't a real `DolColor` (see src/utils/tw-colors.ts) - it's this
// hook's own "no real status yet" case, kept separate from the app's
// brand-color system on purpose.
export type MintStatusColor = "gray" | "red" | "yellow" | "green";
export type MintStatusLabel = "Loading" | "Unknown" | "Claimed" | "Locked" | "Available";

export type MintStatus = {
  label: MintStatusLabel;
  color: MintStatusColor;
  emoji: React.ReactNode;
};

// Single source of truth for "what does this performance's mint status
// mean" - color, label, and emoji all derived from the same few booleans.
// MintStatusIndicator (compact inline pill, 3 call sites) consumes this
// instead of re-deriving it independently - exactly the kind of split-
// brain-status risk the `mutatePerformance`/staleness work (PUNCHLIST
// Finding 51) already cost real debugging time on once. Performance.tsx's
// own hero pill (MintActionPill) has since grown beyond this hook's
// performance-only states (wallet connection, association, app-wide
// gating) and resolves its color/label itself - see PUNCHLIST.md Phase 9.
export const useMintStatus = (
  performance?: DolPerformance,
  loading?: boolean
): MintStatus =>
  useMemo(() => {
    const notFound = !loading && !performance;
    const isMinted = Boolean(performance?.serial);
    const isLocked = Boolean(performance?.lockedBy);

    const color: MintStatusColor = loading || notFound ? "gray"
      : isMinted ? "red"
      : isLocked ? "yellow"
      : "green";
    const label = loading ? "Loading"
      : notFound ? "Unknown"
      : isMinted ? "Claimed"
      : isLocked ? "Locked"
      : "Available";
    const emoji = loading ? <AnimatedDonut sizeInPixels={16} />
      : notFound ? "❓"
      : isMinted ? "🔴"
      : isLocked ? "🟡"
      : "🟢";

    return { label, color, emoji };
  }, [performance, loading]);
