import Link from "next/link";
import { usePathname } from "next/navigation";
import { twMerge } from "tailwind-merge";
import { getEraColor, getVenueLocation } from "@erikmuir/dol-lib/dapp";
import { toFriendlyDate } from "@erikmuir/dol-lib/utils";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";
import { Loading } from "@/components/common/Loading";
import { MintStatusIndicator } from "@/components/common/MintStatusIndicator";
import { useSetlistsBySongSlug } from "@/hooks";

export const Song = (): React.ReactElement => {
  const pathname = usePathname();
  const pathParts = pathname.split("/");
  const slug = pathParts.at(-1) ?? "";

  const { setlists, setlistsLoading } = useSetlistsBySongSlug(slug);

  if (setlistsLoading) {
    return <Loading />
  }

  if (!setlists || setlists.length === 0) {
    return <div className="text-center text-lg text-dol-red">No performances found</div>;
  }

  const setlistItems = setlists.map((setlist, index) => {
    const { showDate, position, venue, city, state, country } = setlist;
    const eraColor = getEraColor(showDate);
    const eraBgColor = getTwDolColor(eraColor, TwColorClassPrefix.Background);
    return (
      <Link
        key={index}
        href={`/shows/${showDate}/${position}`}
        className={twMerge(
          "flex p-2 w-full",
          "bg-gray-dark/25",
          "border border-gray-dark/50",
          "rounded-lg shadow-md",
          "hover:bg-gray-dark/50 duration-300",
        )}
      >
        <div className={twMerge("w-1 rounded-full", eraBgColor)} />
        <div className="flex flex-col items-center grow text-center text-balance">
          <div className="text-lg">{toFriendlyDate(showDate)}</div>
          <div className="text-sm">{venue}, {getVenueLocation(city, state, country)}</div>
          <MintStatusIndicator date={showDate} position={position} className="mt-2" />
        </div>
        <div className="w-1"></div>
      </Link>
    );
  });

  return (
    <div className={twMerge(
      "w-[320px] md:w-[500px] mx-auto",
      "flex flex-col items-center gap-6",
      )}>
      <div>
        <div className="text-center text-3xl text-balance">
          {setlists[0].song}
        </div>
        <div className="text-center text-sm text-gray-medium">
          {setlists?.length} Performances Found
        </div>
      </div>
      <div className="w-full flex flex-col gap-3">
        {setlistItems}
      </div>
    </div>
  );
};