import Link from "next/link";
import { DolPerformance } from "@erikmuir/dol-lib/types";
import { MintStatusIndicator, MintStatusIndicatorType } from "@/components/common/MintStatusIndicator";

export type SongRowProps = {
  showDate: string;
  position: number;
  song: string;
  transition: number;
  transMark: string;
  performance?: DolPerformance;
};

export const SongRow = ({
  showDate,
  position,
  song,
  transition,
  transMark,
  performance,
}: SongRowProps): React.ReactNode => {
  const href = `/shows/${showDate}/${position}`;
  return (
    <div className="border-t border-gray-dark-2 cursor-pointer hover:bg-gray-dark-2">
      <Link href={href}>
        <div className="p-3 px-4 flex items-center justify-between">
          <div>{song}{transition !== 1 ? transMark : ""}</div>
          <MintStatusIndicator
            date={showDate}
            position={position}
            performance={performance}
            type={MintStatusIndicatorType.LabelAndEmoji}
            className=""
          />
        </div>
      </Link>
    </div>
  );
};
