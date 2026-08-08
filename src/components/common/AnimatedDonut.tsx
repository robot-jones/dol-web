import { twMerge } from "tailwind-merge";
import { DolColor } from "@erikmuir/dol-lib/types";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";

type AnimatedDonutProps = {
  sizeInPixels?: number;
  color?: DolColor;
  twAnimation?: string;
  className?: string;
};

export const AnimatedDonut = ({
  sizeInPixels = 60,
  color = "red",
  twAnimation = "animate-spin border-l-gray-dark",
  className,
}: AnimatedDonutProps): React.ReactElement => {
  const borderColor = getTwDolColor(color, TwColorClassPrefix.Border);
  return (
    <div
      className={twMerge("rounded-full", borderColor, twAnimation, className)}
      style={{
        width: `${sizeInPixels}px`,
        height: `${sizeInPixels}px`,
        borderWidth: `${Math.floor(sizeInPixels / 4)}px`,
      }}
    />
  );
};
