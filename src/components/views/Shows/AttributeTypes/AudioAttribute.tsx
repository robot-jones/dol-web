import { twMerge } from "tailwind-merge";
import { AnimatedDonut } from "@/components/common/AnimatedDonut";
import { getLabelTextColorClass } from "@erikmuir/dol-lib/dapp";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";
import { BaseAttributeProps } from "./types";

export type AudioAttributeProps = BaseAttributeProps & {
  src?: string;
};

export const AudioAttribute = ({
  label,
  src,
  loading,
  fullWidth,
  textColor = "light",
  attributeColor,
}: AudioAttributeProps): React.ReactNode => {
  const getContent = () => {
    if (loading) {
      return <AnimatedDonut sizeInPixels={20} className="mt-[2px]" />;
    }

    if (!src) {
      return <div className="text-gray-medium">--null--</div>;
    }

    const audioPlayerColor = attributeColor || textColor;
    const audioPlayerBackground = !["blue", "green", "red", "yellow"].includes(audioPlayerColor)
      ? getTwDolColor("light", TwColorClassPrefix.Background, 100, "[&::-webkit-media-controls-panel]")
      : getTwDolColor(audioPlayerColor, TwColorClassPrefix.Background, 50, "[&::-webkit-media-controls-panel]");
    const audioPlayerText = getTwDolColor(textColor, TwColorClassPrefix.Text);

    return (
      <div className={twMerge("relative", fullWidth ? "w-full" : "w-[300px]")}>
        <audio
          controls
          className={twMerge(audioPlayerBackground, audioPlayerText, "font-mono")}
        >
          <source src={src} type="audio/mp3" />
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  };

  const defaultedColor = attributeColor || "light";
  const attributeBackground = !["blue", "green", "red", "yellow"].includes(defaultedColor)
    ? getTwDolColor("light", TwColorClassPrefix.Background, 100)
    : getTwDolColor(defaultedColor, TwColorClassPrefix.Background, 25);
  const attributeBorder = !["blue", "green", "red", "yellow"].includes(attributeColor || "")
    ? "border-gray-medium"
    : getTwDolColor(defaultedColor, TwColorClassPrefix.Border);

  return (
    <div
      className={twMerge(
        "border rounded p-2 whitespace-nowrap text-center self-stretch",
        fullWidth ? "w-full" : "",
        attributeBackground,
        attributeBorder,
      )}
    >
      {label && (
        <div
          className={twMerge(
            "text-[10px] uppercase text-gray-medium",
            getLabelTextColorClass(attributeColor)
          )}
        >
          {label}
        </div>
      )}
      <div className="flex flex-col items-center justify-center">
        {getContent()}
      </div>
    </div>
  );
};
