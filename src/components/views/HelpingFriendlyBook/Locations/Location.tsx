import { twMerge } from "tailwind-merge";
import { sanitizeText } from "@erikmuir/dol-lib/utils";
import { ItemCountPill } from "@/components/common/ItemCountPill";
import { LocationShowCount, LocationType } from "./types";

export type LocationProps = {
  name: string;
  targets: LocationShowCount[];
  locationType: LocationType;
  jumpTo: (name: string, value: string) => void;
};

export const Location = ({
  name,
  targets,
  locationType,
  jumpTo,
}: LocationProps): React.ReactElement => {
  return (
    <div className="w-full max-w-[320px] sm:max-w-[448px] md:max-w-[500px] mx-auto flex flex-col items-center justify-center">
      <div className="text-2xl text-dol-yellow pb-4 text-center">
        {sanitizeText(name)}
      </div>
      {targets.map(([target, showCount], index: number) => {
        return (
          <div
            key={target}
            onClick={() => jumpTo(locationType, target)}
            className={twMerge(
              "py-4 px-2 w-full",
              "cursor-pointer hover:bg-gray-dark",
              "border-t border-gray-dark last:border-b",
              "flex items-center justify-between"
            )}
          >
            <div className="text-2xl">{sanitizeText(target)}</div>
            <ItemCountPill
              item="show"
              count={showCount}
              twSize="sm"
              seed={index}
            />
          </div>
        );
      })}
    </div>
  );
};
