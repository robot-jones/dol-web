import Image from "next/image";
import { twMerge } from "tailwind-merge";
import { getDolColorFromHexValue } from "@erikmuir/dol-lib/dapp";
import { type PerformanceImageAttributes } from "@erikmuir/dol-lib/types";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";
import { Donut } from "@/components/common/Shapes";

export const NFTPlaceholder = ({
  song,
  performanceId,
  bgColor,
  donut,
  subject,
}: PerformanceImageAttributes): React.ReactNode => {
  const dolColor = getDolColorFromHexValue(bgColor) || "light";

  const bgColorClassName = getTwDolColor(dolColor, TwColorClassPrefix.Background);

  return (
    <div
      className={twMerge(
        "relative w-[374px] h-[420px] shadow-lg cursor-default",
        "rounded-2xl overflow-hidden border border-gray-dark",
        bgColorClassName
      )}
    >
      {donut && <Donut sizeInPixels={300} color={donut} className="m-[36px]" />}
      {subject && (
        <Image
          src={`/subjects/${subject}.png`}
          alt={subject}
          width={372}
          height={372}
          className="absolute top-0 left-0"
          priority
        />
      )}
      <div
        className={twMerge(
          "absolute bottom-0 left-0 right-0",
          "p-1 text-center bg-gray-dark/75"
        )}
      >
        <div className="text-dol-light text-balance">{song}</div>
        <div className="text-dol-yellow text-[10px] tracking-wider">
          {performanceId}
        </div>
      </div>
    </div>
  );
};
