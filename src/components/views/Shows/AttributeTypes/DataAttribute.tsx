import Link from "next/link";
import { twMerge } from "tailwind-merge";
import { getLabelTextColorClass } from "@erikmuir/dol-lib/dapp";
import { sanitizeText } from "@erikmuir/dol-lib/utils";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";
import { AnimatedDonut } from "@/components/common/AnimatedDonut";
import { BaseAttributeProps } from "./types";

export type DataAttributeProps = BaseAttributeProps & {
  data?: string | number;
  href?: string;
};

export const DataAttribute = ({
  label,
  data,
  href,
  loading,
  textColor = "light",
  attributeColor,
  fullWidth,
}: DataAttributeProps): React.ReactNode => {
  const getContent = () => {
    if (loading) {
      return <AnimatedDonut sizeInPixels={20} className="mt-[2px]" />;
    }

    if (!data) {
      return <div className="text-gray-medium">--null--</div>;
    }

    const sanitizedText = sanitizeText(`${data}`);

    if (href?.startsWith("/")) {
      return (
        <Link href={href} className="hover:text-dol-yellow">
          {sanitizedText}
        </Link>
      );
    }

    if (href) {
      return (
        <a href={href} className="hover:text-dol-yellow" target="_blank" rel="noopener noreferrer">
          {sanitizedText}
        </a>
      );
    }

    return <div>{sanitizedText}</div>;
  };

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
        {getContent()}
      </div>
    </div>
  );
};
