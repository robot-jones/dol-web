import Image from "next/image";
import { twMerge } from "tailwind-merge";
import { getDolColorFromHexValue } from "@erikmuir/dol-lib/dapp";
import { type PerformanceImageAttributes } from "@erikmuir/dol-lib/types";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";
import { Donut } from "@/components/common/Shapes";

// Mirrors renderPerformanceImage (dol-lib) so the pre-mint preview matches
// the real render exactly - square, no baked-in song title/performance ID.
// That info is already carried in the NFT's own metadata (name/description),
// which every wallet/marketplace displays alongside the image anyway - see
// PUNCHLIST.md Phase 9. song/performanceId still come through in the shared
// PerformanceImageAttributes type (used elsewhere, e.g. as the image's own
// IPFS filename) - this component just no longer renders them.
export const NFTPlaceholder = ({
  bgColor,
  donut,
  subject,
}: PerformanceImageAttributes): React.ReactNode => {
  const dolColor = getDolColorFromHexValue(bgColor) || "light";

  const bgColorClassName = getTwDolColor(dolColor, TwColorClassPrefix.Background);

  return (
    <div
      className={twMerge(
        "relative w-[374px] h-[374px] shadow-lg cursor-default",
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
    </div>
  );
};
