import { DolColor } from "@erikmuir/dol-lib/types";

// Lives here (not dol-lib, outside Tailwind's content-scan path) with
// every class name written as a literal string so Tailwind's scanner
// picks them up on its own - no `safelist` needed.

export enum TwColorClassPrefix {
  Background = "bg-",
  Border = "border-",
  Text = "text-",
}

export type TwColorClassPercentage = 10 | 25 | 50 | 100;

type ClassesByColor = Record<DolColor, string>;

const TEXT_100: ClassesByColor = {
  blue: "text-dol-blue",
  green: "text-dol-green",
  red: "text-dol-red",
  yellow: "text-dol-yellow",
  dark: "text-dol-dark",
  light: "text-dol-light",
};

const BORDER_100: ClassesByColor = {
  blue: "border-dol-blue",
  green: "border-dol-green",
  red: "border-dol-red",
  yellow: "border-dol-yellow",
  dark: "border-dol-dark",
  light: "border-dol-light",
};

const BORDER_25: ClassesByColor = {
  blue: "border-dol-blue/25",
  green: "border-dol-green/25",
  red: "border-dol-red/25",
  yellow: "border-dol-yellow/25",
  dark: "border-dol-dark/25",
  light: "border-dol-light/25",
};

const BACKGROUND_100: ClassesByColor = {
  blue: "bg-dol-blue",
  green: "bg-dol-green",
  red: "bg-dol-red",
  yellow: "bg-dol-yellow",
  dark: "bg-dol-dark",
  light: "bg-dol-light",
};

const BACKGROUND_50: ClassesByColor = {
  blue: "bg-dol-blue/50",
  green: "bg-dol-green/50",
  red: "bg-dol-red/50",
  yellow: "bg-dol-yellow/50",
  dark: "bg-dol-dark/50",
  light: "bg-dol-light/50",
};

const BACKGROUND_25: ClassesByColor = {
  blue: "bg-dol-blue/25",
  green: "bg-dol-green/25",
  red: "bg-dol-red/25",
  yellow: "bg-dol-yellow/25",
  dark: "bg-dol-dark/25",
  light: "bg-dol-light/25",
};

const BACKGROUND_10: ClassesByColor = {
  blue: "bg-dol-blue/10",
  green: "bg-dol-green/10",
  red: "bg-dol-red/10",
  yellow: "bg-dol-yellow/10",
  dark: "bg-dol-dark/10",
  light: "bg-dol-light/10",
};

// The <audio> element's native controls panel can only be styled via this
// webkit-specific arbitrary selector - the one non-color variant this app
// actually applies through getTwDolColor. See AudioAttribute.tsx.
const WEBKIT_MEDIA_CONTROLS_BACKGROUND_100: ClassesByColor = {
  blue: "[&::-webkit-media-controls-panel]:bg-dol-blue",
  green: "[&::-webkit-media-controls-panel]:bg-dol-green",
  red: "[&::-webkit-media-controls-panel]:bg-dol-red",
  yellow: "[&::-webkit-media-controls-panel]:bg-dol-yellow",
  dark: "[&::-webkit-media-controls-panel]:bg-dol-dark",
  light: "[&::-webkit-media-controls-panel]:bg-dol-light",
};

const WEBKIT_MEDIA_CONTROLS_BACKGROUND_50: ClassesByColor = {
  blue: "[&::-webkit-media-controls-panel]:bg-dol-blue/50",
  green: "[&::-webkit-media-controls-panel]:bg-dol-green/50",
  red: "[&::-webkit-media-controls-panel]:bg-dol-red/50",
  yellow: "[&::-webkit-media-controls-panel]:bg-dol-yellow/50",
  dark: "[&::-webkit-media-controls-panel]:bg-dol-dark/50",
  light: "[&::-webkit-media-controls-panel]:bg-dol-light/50",
};

const CLASSES: Partial<Record<TwColorClassPrefix, Partial<Record<TwColorClassPercentage, ClassesByColor>>>> = {
  [TwColorClassPrefix.Text]: {
    100: TEXT_100,
  },
  [TwColorClassPrefix.Border]: {
    100: BORDER_100,
    25: BORDER_25,
  },
  [TwColorClassPrefix.Background]: {
    100: BACKGROUND_100,
    50: BACKGROUND_50,
    25: BACKGROUND_25,
    10: BACKGROUND_10,
  },
};

type WebkitMediaControlsVariant = "[&::-webkit-media-controls-panel]";

const WEBKIT_CLASSES: Partial<Record<TwColorClassPercentage, ClassesByColor>> = {
  100: WEBKIT_MEDIA_CONTROLS_BACKGROUND_100,
  50: WEBKIT_MEDIA_CONTROLS_BACKGROUND_50,
};

/**
 * Returns a literal Tailwind utility class for a `dol-*` brand color. If
 * this throws, add the missing [prefix][percentage] entry to
 * CLASSES/WEBKIT_CLASSES - don't reach for string interpolation, or the
 * class silently won't exist in the built CSS.
 */
export const getTwDolColor = (
  color: DolColor,
  prefix: TwColorClassPrefix,
  percentage: TwColorClassPercentage = 100,
  variant?: WebkitMediaControlsVariant
): string => {
  const bucket = variant
    ? prefix === TwColorClassPrefix.Background
      ? WEBKIT_CLASSES[percentage]
      : undefined
    : CLASSES[prefix]?.[percentage];
  const cls = bucket?.[color];
  if (!cls) {
    throw new Error(
      `getTwDolColor: no class registered for ${variant ? `${variant}:` : ""}${prefix}${color} at ${percentage}% - add it to src/utils/tw-colors.ts`
    );
  }
  return cls;
};
