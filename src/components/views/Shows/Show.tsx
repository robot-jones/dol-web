import Link from "next/link";
import { notFound, usePathname } from "next/navigation";
import { Setlist } from "@erikmuir/dol-lib/types";
import { getSetText, sortByPosition } from "@erikmuir/dol-lib/dapp";
import { daysUntil, toFriendlyDate, toFriendlyDateTime, sanitizeText } from "@erikmuir/dol-lib/utils";
import { Loading } from "@/components/common/Loading";
import { useSetlists } from "@/hooks/use-setlists";
import { useReviewsByDate } from "@/hooks/use-reviews";
import { useShow } from "@/hooks/use-shows";
import { usePerformances } from "@/hooks/use-performances";
import { Error } from "../Error";
import { MintStatusIndicator, MintStatusIndicatorType } from "@/components/common/MintStatusIndicator";

export const Show = (): React.ReactElement => {
  const pathname = usePathname();
  const pathParts = pathname.split("/");
  const date = pathParts.at(-1) ?? "";
  const { performances } = usePerformances(date);
  const { setlists, setlistsLoading } = useSetlists(date);
  const { reviews } = useReviewsByDate(date);
  const { show } = useShow(date);
  const daysUntilShow = daysUntil(date);

  if (daysUntilShow >= 0) {
    return (
      <Error
        message={`Just ${daysUntilShow} ${
          daysUntilShow === 1 ? "day" : "days"
        } left!`}
      />
    );
  }

  if (setlistsLoading) {
    return <Loading showLyric />;
  }

  if (!setlists || setlists.length === 0) {
    notFound();
  }

  const getShowHeader = (): React.ReactNode => {
    const { showDate, venue, city, state, country } = setlists[0];
    return (
      <div className="flex flex-col items-center text-center pb-6">
        <div className="text-2xl">{toFriendlyDate(showDate)}</div>
        <div className="">{sanitizeText(venue)}</div>
        <div className="">{sanitizeText(`${city}, ${state || country}`)}</div>
      </div>
    );
  };

  const getDistinctSets = (): string[] => [
    ...new Set(setlists.sort(sortByPosition).map((setlist) => setlist.set)),
  ];

  const getSongRow = (setlist: Setlist) => {
    const { id, showDate, position, song, transition, transMark } = setlist;
    const href = `/shows/${showDate}/${position}`;
    const performance = performances?.find(
      (x) => x.showDate === showDate && x.position === position
    );
    return (
      <div
        key={id}
        className="border-t border-gray-dark-2 cursor-pointer hover:bg-gray-dark-2"
      >
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

  return (
    <div className="w-full max-w-[320px] sm:max-w-[448px] md:max-w-[500px] lg:max-w-[680px] mx-auto flex flex-col items-center mt-8">
      {getShowHeader()}
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
                .map((setlist) => getSongRow(setlist))}
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
