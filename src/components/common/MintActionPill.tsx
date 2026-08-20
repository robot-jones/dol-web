"use client";

import { twMerge } from "tailwind-merge";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";
import { MintStatusColor } from "@/hooks";

export type MintActionColor = MintStatusColor | "blue";

export type MintActionPillProps = {
  color: MintActionColor;
  label: string;
  onClick?: () => void;
  className?: string;
};

// Same border/25 + background/25 + solid-text recipe the old MintStatusBanner
// used (PageNote.tsx's colored-callout pattern). Gray isn't a real DolColor
// (see tw-colors.ts) so it gets its own literal pair rather than going
// through getTwDolColor.
const getColorClasses = (color: MintActionColor): string =>
  color === "gray"
    ? "border-gray-medium/25 bg-gray-medium/10 text-gray-light"
    : twMerge(
      getTwDolColor(color, TwColorClassPrefix.Border, 25),
      getTwDolColor(color, TwColorClassPrefix.Background, 25),
      getTwDolColor(color, TwColorClassPrefix.Text),
    );

// Doubles as the performance's live status (color + label, replacing the
// old MintStatusBanner) and, only when `onClick` is given, the actual mint
// action (replacing the old blue Mint button) - see PUNCHLIST.md Phase 9.
// Renders as a plain div - not a permanently-disabled button - whenever
// there's nothing to click, so it's not a dead tab stop.
export const MintActionPill = ({
  color,
  label,
  onClick,
  className,
}: MintActionPillProps): React.ReactElement => {
  const classes = twMerge(
    "w-full flex items-center justify-center gap-2",
    "rounded-md border py-4 px-4 text-lg font-semibold uppercase tracking-wide text-center",
    getColorClasses(color),
    onClick && "cursor-pointer hover:brightness-110 transition-[filter] duration-300",
    className,
  );

  return onClick ? (
    <button type="button" onClick={onClick} className={classes}>{label}</button>
  ) : (
    <div className={classes}>{label}</div>
  );
};
