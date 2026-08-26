import { twMerge } from "tailwind-merge";
import { getLabelTextColorClass } from "@erikmuir/dol-lib/dapp";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";
import { AnimatedDonut } from "@/components/common/AnimatedDonut";
import { BaseAttributeProps } from "./types";

export type BooleanAttributeProps = BaseAttributeProps & {
  bool?: boolean;
};

export const BooleanAttribute = ({
  label,
  bool = false,
  loading,
  textColor = "light",
  attributeColor,
  fullWidth,
}: BooleanAttributeProps): React.ReactNode => {
  const content = loading ? (
    <AnimatedDonut sizeInPixels={20} className="mt-[2px]" />
  ) : (
    <div>{bool ? "true" : "false"}</div>
  );

  return (
    <div
      className={twMerge(
        "border rounded p-2 whitespace-nowrap text-center self-stretch",
        fullWidth ? "w-full" : "w-fit",
        attributeColor ? getTwDolColor(attributeColor, TwColorClassPrefix.Border) : "border-gray-medium",
        attributeColor ? getTwDolColor(attributeColor, TwColorClassPrefix.Background, 25) : "bg-gray-dark/75",
      )}
    >
      {label && (
        <div
          className={twMerge(
            "text-[10px] uppercase",
            getLabelTextColorClass(attributeColor)
          )}
        >
          {label}
        </div>
      )}
      <div
        className={twMerge(
          "flex flex-col items-center justify-center font-mono",
          getTwDolColor(textColor, TwColorClassPrefix.Text),
        )}
      >
        {content}
      </div>
    </div>
  );
};
