import Link from "next/link";
import { Show } from "@erikmuir/dol-lib/types";
import {
  getMonthShortName,
  sanitizeText,
} from "@erikmuir/dol-lib/utils";

export type ShowsForVenueProps = {
  header: string;
  shows: Show[];
};

export const ShowsForVenue = ({
  header,
  shows,
}: ShowsForVenueProps): React.ReactElement => {
  return (
    <div className="w-full max-w-[320px] sm:max-w-[448px] md:max-w-[500px] lg:max-w-[680px] mx-auto flex flex-col items-center justify-center gap-4">
      <div className="text-2xl text-dol-yellow pb-4 text-center">
        {sanitizeText(header)}
      </div>
      {shows.map((show) => {
        const cityText = `${show.city}, ${show.state || show.country}`;
        return (
          <Link
            key={show.id}
            href={`/shows/${show.showDate}`}
            className="hover:bg-gray-dark-2 rounded border border-gray-dark w-full"
          >
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center place-self-stretch justify-center bg-dol-blue w-20 min-w-20 py-2 rounded-l">
                <div className="text-xs uppercase tracking-widest">
                  {getMonthShortName(show.showMonth)} {show.showDay}
                </div>
                <div className="text-2xl">{show.showYear}</div>
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
