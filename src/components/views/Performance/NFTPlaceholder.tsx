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
        "relative w-full aspect-square shadow-lg cursor-default",
        "rounded-2xl overflow-hidden border border-gray-dark",
        bgColorClassName
      )}
    >
      {/* Percentage-based, not sizeInPixels - keeps the same ~80%-filled,
          centered look (was 300px donut / 36px margin on a fixed 374px box)
          now that this box is full-width and its size varies by breakpoint. */}
      {donut && (
        <Donut
          color={donut}
          className="absolute top-[9.63%] left-[9.63%] w-[80.21%] h-[80.21%]"
        />
      )}
      {subject && (
        <Image
          src={`/subjects/${subject}.png`}
          alt={subject}
          fill
          sizes="(min-width: 1024px) 680px, (min-width: 768px) 500px, (min-width: 640px) 448px, 320px"
          className="object-cover"
          priority
        />
      )}
    </div>
  );
};
