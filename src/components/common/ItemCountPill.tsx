import { twMerge } from "tailwind-merge";
import { type DolColor } from "@erikmuir/dol-lib/types";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";

export type ItemCountPillProps = {
  item: string;
  count: number;
  plural?: string;
  dolColor?: DolColor;
  twSize?: string;
  hidden?: boolean;
  className?: string;
  seed?: number;
};

export const ItemCountPill = ({
  item,
  count,
  plural = `${item}s`,
  dolColor,
  twSize = "md",
  hidden = false,
  className,
  seed = 0,
}: ItemCountPillProps): React.ReactElement => {
  if (hidden) return <></>;

  dolColor ||= getDeterminitiveDolColor(seed);

  const text = Number(count) === 1 ? item : plural;
  const bgColor = getTwDolColor(dolColor, TwColorClassPrefix.Background);
  const borderColor = getTwDolColor(dolColor, TwColorClassPrefix.Border);
  const {
    twTextSize,
    twOuterPaddingLeft,
    twOuterPaddingRight,
    twInnerPaddingLeft,
    twInnerPaddingRight,
  } = getSizeValues(twSize);
  return (
    <div
      className={twMerge(
        "flex items-center w-min rounded-full border",
        className,
        borderColor,
        hidden ? "invisible" : "visible"
      )}
    >
      <div
        className={twMerge(
          "rounded-l-full text-white",
          twTextSize,
          twOuterPaddingLeft,
          twInnerPaddingRight,
          bgColor
        )}
      >
        {count}
      </div>
      <div
        className={twMerge(
          "rounded-r-full",
          twTextSize,
          twOuterPaddingRight,
          twInnerPaddingLeft
        )}
      >
        {text}
      </div>
    </div>
  );
};

const getSizeValues = (twSize: string): SizeValues => {
  switch (twSize) {
    case "xs":
      return {
        twTextSize: "text-xs",
        twOuterPaddingLeft: "pl-2",
        twOuterPaddingRight: "pr-2",
        twInnerPaddingLeft: "pl-1",
        twInnerPaddingRight: "pr-2",
      };
    case "sm":
      return {
        twTextSize: "text-sm",
        twOuterPaddingLeft: "pl-2",
        twOuterPaddingRight: "pr-2",
        twInnerPaddingLeft: "pl-1",
        twInnerPaddingRight: "pr-2",
      };
    case "md":
      return {
        twTextSize: "text-md",
        twOuterPaddingLeft: "pl-3",
        twOuterPaddingRight: "pr-3",
        twInnerPaddingLeft: "pl-2",
        twInnerPaddingRight: "pr-3",
      };
    case "lg":
      return {
        twTextSize: "text-lg",
        twOuterPaddingLeft: "pl-3",
        twOuterPaddingRight: "pr-3",
        twInnerPaddingLeft: "pl-2",
        twInnerPaddingRight: "pr-3",
      };
    case "xl":
      return {
        twTextSize: "text-xl",
        twOuterPaddingLeft: "pl-4",
        twOuterPaddingRight: "pr-4",
        twInnerPaddingLeft: "pl-2",
        twInnerPaddingRight: "pr-4",
      };
    default:
      throw new Error(`Unrecognized tailwind size: '${twSize}'`);
  }
};

export type SizeValues = {
  twTextSize: string;
  twOuterPaddingLeft: string;
  twOuterPaddingRight: string;
  twInnerPaddingLeft: string;
  twInnerPaddingRight: string;
};

export const getDeterminitiveDolColor = (value: number): DolColor => {
  const mod = value % 3;
  switch (mod) {
    case 0:
      return "blue";
    case 1:
      return "green";
    case 2:
      return "red";
    // if we want to support yellow pills, we'll need to dynamically change the text color
    default:
      return "blue";
  }
};
