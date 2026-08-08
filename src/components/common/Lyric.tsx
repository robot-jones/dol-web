import { twMerge } from "tailwind-merge";
import { DolColor, LyricLine } from "@erikmuir/dol-lib/types";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";

export type LyricProps = {
  lines?: LyricLine[];
  highlightColor?: DolColor;
};

export const Lyric = ({
  lines = [],
  highlightColor = "yellow",
}: LyricProps): React.ReactElement => {
  const highlightClass = getTwDolColor(highlightColor, TwColorClassPrefix.Text);

  return (
    <div className="flex flex-col items-center justify-center">
      {lines.map((segments, lineIndex) => (
        <div
          className="flex items-center justify-center gap-2"
          key={`line-${lineIndex}`}
        >
          {segments.map((segment, segmentIndex) => (
            <div
              className={twMerge(
                "text-balance",
                segment.highlight ? highlightClass : ""
              )}
              key={`segment-${segmentIndex}`}
            >
              {segment.text}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
