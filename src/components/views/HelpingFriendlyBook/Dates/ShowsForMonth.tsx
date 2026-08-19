import Link from "next/link";
import { Show } from "@erikmuir/dol-lib/types";
import { getDayShortName, sanitizeText } from "@erikmuir/dol-lib/utils";
import { twMerge } from "tailwind-merge";

export type ShowsForMonthProps = {
  header: string;
  shows: Show[];
};

export const ShowsForMonth = ({
  header,
  shows,
}: ShowsForMonthProps): React.ReactElement => {
  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit" };
  const dateParts = new Date().toLocaleDateString("en-US", options).split("/");
  const today = `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`;
  return (
    <div className="w-full max-w-[320px] sm:max-w-[448px] md:max-w-[500px] lg:max-w-[680px] mx-auto flex flex-col items-center justify-center gap-4">
      <div className="text-2xl text-dol-yellow pb-4 text-center">
        {sanitizeText(header)}
      </div>
      {shows.map((show) => {
        const cityText = `${show.city}, ${show.state || show.country}`;
        const bgColor = show.showDate < today ? "bg-dol-blue" : "bg-gray-dark";
        return (
          <Link
            key={show.id}
            href={`/shows/${show.showDate}`}
            className="hover:bg-gray-dark-2 rounded border border-gray-dark w-full"
          >
            <div className="flex items-center gap-4">
              <div className={twMerge(
                "flex flex-col items-center place-self-stretch justify-center",
                "w-20 min-w-20 py-1 rounded-l",
                bgColor,
              )}>
                <div className="text-sm uppercase tracking-widest">
                  {getDayShortName(show.showDate)}
                </div>
                <div className="text-4xl">{show.showDay}</div>
              </div>
              <div className="flex flex-col py-1 pr-4 rounded-r">
                <div className="text-xs">{sanitizeText(cityText)}</div>
                <div className="text-xl">{sanitizeText(show.venue)}</div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};
