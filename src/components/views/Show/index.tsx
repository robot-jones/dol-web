import { notFound, usePathname } from "next/navigation";
import { getSetText, sortByPosition } from "@erikmuir/dol-lib/dapp";
import { daysUntil, toFriendlyDateTime, sanitizeText } from "@erikmuir/dol-lib/utils";
import { Loading } from "@/components/common/Loading";
import { useSetlists } from "@/hooks/use-setlists";
import { useReviewsByDate } from "@/hooks/use-reviews";
import { useShow } from "@/hooks/use-shows";
import { usePerformances } from "@/hooks/use-performances";
import { isRecentShow } from "@/utils";
import { Error } from "../Error";
import { ShowHeader } from "./ShowHeader";
import { SongRow } from "./SongRow";

const containerClassName =
  "w-full max-w-[320px] sm:max-w-[448px] md:max-w-[500px] lg:max-w-[680px] mx-auto flex flex-col items-center mt-8";

export const Show = (): React.ReactElement => {
  const pathname = usePathname();
  const pathParts = pathname.split("/");
  const date = pathParts.at(-1) ?? "";
  const { performances } = usePerformances(date);
  const { setlists, setlistsLoading } = useSetlists(date);
  const { reviews } = useReviewsByDate(date);
  const { show, showLoading } = useShow(date);
  const daysUntilShow = daysUntil(date);

  // Strictly future (the day of the show itself falls through to the
  // setlist/pending view below, not the countdown - once doors open, fans
  // want to see the list fill in, not a frozen "0 days left").
  if (daysUntilShow > 0) {
    return (
      <Error
        message={`Just ${daysUntilShow} ${
          daysUntilShow === 1 ? "day" : "days"
        } left!`}
      />
    );
  }

  if (setlistsLoading || showLoading) {
    return <Loading showLyric />;
  }

  if (!setlists || setlists.length === 0) {
    // Same recency heuristic as the audio player: a show that just happened
    // (or is happening tonight) probably just hasn't had its setlist
    // uploaded yet, so say that instead of a flat 404.
    if (!isRecentShow(date)) {
      notFound();
    }

    return (
      <div className={containerClassName}>
        {show && <ShowHeader {...show} />}
        <div className="text-xl text-center text-gray-medium pb-16">
          Setlists haven&apos;t been uploaded yet — check back soon.
        </div>
      </div>
    );
  }

  const getDistinctSets = (): string[] => [
    ...new Set(setlists.sort(sortByPosition).map((setlist) => setlist.set)),
  ];

  return (
    <div className={containerClassName}>
      <ShowHeader {...setlists[0]} />
      <div className="flex flex-col items-center gap-8 pb-16 w-full">
        {getDistinctSets().map((set) => {
          return (
            <div
              key={set}
              className="w-full bg-gray-dark rounded overflow-hidden"
            >
              <div className="bg-dol-blue uppercase tracking-widest text-center text-sm rounded-t p-1">
                {getSetText(set)}
              </div>
              {setlists
                .filter((s) => s.set === set)
                .sort(sortByPosition)
                .map((setlist) => {
                  const performance = performances?.find(
                    (x) =>
                      x.showDate === setlist.showDate &&
                      x.position === setlist.position
                  );
                  return (
                    <SongRow
                      key={setlist.id}
                      showDate={setlist.showDate}
                      position={setlist.position}
                      song={setlist.song}
                      transition={setlist.transition}
                      transMark={setlist.transMark}
                      performance={performance}
                    />
                  );
                })}
            </div>
          );
        })}
      </div>
      {show && show.setlistNotes && (
        <div className="flex flex-col items-center gap-4 pb-16">
          <div className="text-2xl uppercase tracking-widest text-center">
            Setlist Notes
          </div>
          <div>{sanitizeText(show.setlistNotes)}</div>
          <div className="text-xs text-gray-medium italic">via phish.net</div>
        </div>
      )}
      {reviews && reviews.length > 0 && (
        <div className="flex flex-col items-center gap-8">
          <div className="flex flex-col items-center">
            <div className="text-2xl uppercase tracking-widest">Reviews</div>
            <div className="text-xs text-gray-medium italic">via phish.net</div>
          </div>
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-gray-dark p-6 md:p-8 rounded w-full"
            >
              <div className="text-sm">{sanitizeText(review.reviewText)}</div>
              <div className="text2xl text-right pt-2">
                -- {review.username}
              </div>
              <div className="text-xs text-right">
                {toFriendlyDateTime(review.postedAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
