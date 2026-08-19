import { twMerge } from "tailwind-merge";
import { sanitizeText, getMonthName } from "@erikmuir/dol-lib/utils";
import { ItemCountPill } from "@/components/common/ItemCountPill";
import { DateShowCount, DateType } from "./types";

export type DateProps = {
  name: string;
  targets: DateShowCount[];
  dateType: DateType;
  jumpTo: (name: string, value: string) => void;
};

export const getEraText = (era: string): string => {
  switch (era) {
    case "1.0":
      return "1983 - 2000";
    case "2.0":
      return "2001 - 2004";
    case "3.0":
      return "2008 - 2020";
    case "4.0":
      return "2021 - present";
    default:
      return era;
  }
};

export const Date = ({
  name,
  targets,
  dateType,
  jumpTo,
}: DateProps): React.ReactElement => {
  return (
    <div className="w-full max-w-[320px] sm:max-w-[448px] md:max-w-[500px] mx-auto flex flex-col items-center justify-center">
      <div className="text-2xl text-dol-yellow pb-4 text-center">
        {sanitizeText(name)}
      </div>
      {targets.map(([target, showCount], index: number) => {
        const targetText = dateType === "month" ? getMonthName(target) : target;
        return (
          <div
            key={target}
            role="button"
            tabIndex={0}
            onClick={() => jumpTo(dateType, target)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                jumpTo(dateType, target);
              }
            }}
            className={twMerge(
              "py-4 px-2 w-full",
              "cursor-pointer hover:bg-gray-dark",
              "border-t border-gray-dark last:border-b",
              "flex items-center justify-between"
            )}
          >
            <div className="flex items-center gap-4">
              <div className="text-2xl">{sanitizeText(targetText)}</div>
              {dateType === "era" && (
                <div className="text-xs text-gray-medium">
                  {getEraText(target)}
                </div>
              )}
            </div>
            <div className="">
              <ItemCountPill
                item="show"
                count={showCount}
                twSize="sm"
                seed={index}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
