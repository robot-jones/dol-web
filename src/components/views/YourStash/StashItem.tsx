import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BiSolidError } from "react-icons/bi";
import { FaPlusCircle } from "react-icons/fa";
import { twMerge } from "tailwind-merge";
import { getEraColor, getTwDolColor, extractPerformanceAttributes } from "@erikmuir/dol-lib/dapp";
import { PerformanceAttributes, TwColorClassPrefix } from "@erikmuir/dol-lib/types";
import { ipfsToHttps, toFriendlyDate } from "@erikmuir/dol-lib/utils";
import { useNftMetadata } from "@/hooks";
import { Loading } from "@/components/common/Loading";

export const AddToStashItem = (): React.ReactNode => {
  return (
    <Link
      href="/helping-friendly-book/songs"
      className={twMerge(
        "flex items-center justify-center gap-4 w-[320px] py-4",
        "text-dol-light/50 hover:text-dol-light duration-500",
        "border border-gray-dark rounded-xl overflow-hidden",
        "hover:bg-gray-dark"
      )}
    >
      <FaPlusCircle size={30} />
      <div className="text-center text-balance text-xl uppercase tracking-widest">
        Add to Your Stash
      </div>
    </Link>
  );
};

export type StashItemProps = {
  tokenId: string;
  serial: number;
};

export const StashItem = ({
  tokenId,
  serial,
}: StashItemProps): React.ReactNode => {
  const [attributes, setAttributes] = useState<PerformanceAttributes>({});

  const { metadata, metadataLoading } = useNftMetadata(tokenId, serial);

  useEffect(() => {
    if (metadata?.attributes) {
      setAttributes(extractPerformanceAttributes(metadata.attributes));
    }
  }, [metadata]);

  const getContent = (): React.ReactNode => {
    if (metadataLoading) {
      return <Loading sizeInPixels={60} />;
    }

    if (!metadata) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full">
          <BiSolidError size={60} className="text-dol-yellow" />
          <div className="text-dol-red">Metadata not found!</div>
        </div>
      );
    }

    const eraColor = getEraColor(attributes.date);
    const textColorClass = getTwDolColor(eraColor, TwColorClassPrefix.Text);

    return (
      <div className="flex items-start p-2 gap-2">
        <Image
          src={ipfsToHttps(metadata.image, process.env.NEXT_PUBLIC_PINATA_GATEWAY)}
          alt={metadata.name}
          width={80}
          height={80}
          className="mx-auto rounded-lg w-auto h-auto"
        />
        <div className="grow">
          <div className="text-xl">{attributes.song}</div>
          <div className={twMerge("text-sm", textColorClass)}>
            {toFriendlyDate(attributes.date)}
          </div>
          <div className="text-xs text-gray-medium">{attributes.venue}</div>
          <div className="text-xs text-gray-medium">
            {attributes.city}, {attributes.state || attributes.country}
          </div>
        </div>
      </div>
    );
  };

  const { date, position } = attributes;
  const href =
    date && position
      ? `/shows/${attributes.date}/${attributes.position}`
      : "#";

  return (
    <Link
      href={href}
      className={twMerge(
        "w-[320px] min-h-[140px]",
        "text-center text-balance",
        "hover:bg-dol-blue/10 duration-500"
      )}
    >
      <div
        className={twMerge(
          "w-full text-xs py-2",
          "bg-dol-blue/25 rounded-t-lg overflow-hidden",
          "border-t border-x border-dol-blue/25"
        )}
      >
        Helping Friendly Book #{serial}
      </div>
      <div
        className={twMerge(
          "relative",
          "w-full h-[calc(100%-33px)]",
          "rounded-b-lg overflow-hidden",
          "border-b border-x border-gray-dark"
        )}
      >
        {getContent()}
      </div>
    </Link>
  );
};
