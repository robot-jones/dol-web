"use client";

import { twMerge } from "tailwind-merge";
import { DolPerformance } from "@erikmuir/dol-lib/types";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";
import { useMintStatus, MintStatusColor, MintStatusLabel } from "@/hooks";

export type MintStatusBannerProps = {
  performance?: DolPerformance;
  loading?: boolean;
  className?: string;
};

// Longer, plain-language copy for the hero banner - deliberately separate
// from useMintStatus's short `label` (which MintStatusIndicator's compact
// pill still uses as-is). See PUNCHLIST.md Phase 9 / the design review
// artifact for why this exists as its own component rather than a new
// MintStatusIndicatorType.
const COPY: Record<MintStatusLabel, string> = {
  Available: "Available to mint",
  Locked: "Someone's claiming this",
  Claimed: "Already in someone's stash",
  Loading: "Checking availability…",
  Unknown: "Status unavailable",
};

// Same border/25 + background/25 recipe PageNote.tsx already uses for a
// colored callout, plus a solid text color on top for the label/emoji row.
// Gray isn't a real DolColor (see tw-colors.ts), so it gets its own literal
// pair rather than going through getTwDolColor.
const getBannerColorClasses = (color: MintStatusColor): string =>
  color === "gray"
    ? "border-gray-medium/25 bg-gray-medium/10 text-gray-light"
    : twMerge(
      getTwDolColor(color, TwColorClassPrefix.Border, 25),
      getTwDolColor(color, TwColorClassPrefix.Background, 25),
      getTwDolColor(color, TwColorClassPrefix.Text),
    );

export const MintStatusBanner = ({
  performance,
  loading,
  className,
}: MintStatusBannerProps): React.ReactElement => {
  const { label, color, emoji } = useMintStatus(performance, loading);

  return (
    <div
      className={twMerge(
        "w-full flex items-center justify-center gap-2",
        "rounded-md border py-2 px-3 text-sm font-semibold tracking-wide text-center",
        getBannerColorClasses(color),
        className,
      )}
    >
      <span>{emoji}</span>
      <span>{COPY[label]}</span>
    </div>
  );
};
