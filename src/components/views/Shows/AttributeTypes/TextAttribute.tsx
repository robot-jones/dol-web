import { twMerge } from "tailwind-merge";
import { getLabelTextColorClass } from "@erikmuir/dol-lib/dapp";
import { boldIndicator, sanitizeText } from "@erikmuir/dol-lib/utils";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";
import { AnimatedDonut } from "@/components/common/AnimatedDonut";
import { BaseAttributeProps } from "./types";

export type TextAttributeProps = BaseAttributeProps & {
  text?: string;
  textCentered?: boolean;
};

export const TextAttribute = ({
  label,
  text,
  loading,
  textColor = "light",
  attributeColor,
  fullWidth,
  textCentered,
}: TextAttributeProps): React.ReactNode => {
  const lines = sanitizeText(text)?.split("\n") || [];

  const getContent = () => {
    if (loading) {
      return <AnimatedDonut sizeInPixels={20} className="mt-[2px] mx-auto" />;
    }

    if (!text) {
      return <div className="text-gray-medium text-center">--null--</div>;
    }

    const isAttribution = (line: string, index: number): boolean =>
      (index == 0 && line.startsWith("(")) || line.includes("©");

    return (
      <div className="pt-4">
        {lines.map((line, index) => {
          if (line === "") return <br key={index} />;
          const position = textCentered ? "text-center" : "text-left";
          let color: string = getTwDolColor(textColor, TwColorClassPrefix.Text);
          let size: string = "text-sm";
          let weight: string = "font-normal";

          if (isAttribution(line, index)) {
            color = "text-gray-medium";
            size = "text-xs";
          }

          if (line.startsWith(boldIndicator)) {
            color = "text-white";
            size = "text-lg";
            weight = "font-bold";
            line = line.substring(boldIndicator.length).trim();
          }

          return (
            <p
              key={index}
              className={twMerge("text-wrap", position, color, size, weight)}
            >
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={twMerge(
        "max-h-96 border rounded py-2 px-2 whitespace-nowrap self-stretch",
        fullWidth ? "w-full" : "",
        textCentered ? "text-center" : "text-left",
        attributeColor ? getTwDolColor(attributeColor, TwColorClassPrefix.Border) : "border-gray-medium",
        attributeColor ? getTwDolColor(attributeColor, TwColorClassPrefix.Background, 25) : "bg-gray-dark/75",
      )}
    >
      {label && (
        <div
          className={twMerge(
            "text-[10px] uppercase text-center",
            getLabelTextColorClass(attributeColor)
          )}
        >
          {label}
        </div>
      )}
      <div className="w-full h-[calc(100%-15px)] overflow-y-auto font-mono">
        {getContent()}
      </div>
    </div>
  );
};
