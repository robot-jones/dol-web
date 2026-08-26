import Image from "next/image";
import { DolColorHex, NftMetadata, Subject } from "@erikmuir/dol-lib/types";
import { ipfsToHttps } from "@erikmuir/dol-lib/utils";
import { Loading } from "@/components/common/Loading";
import { NFTPlaceholder } from "./NFTPlaceholder";

export type PerformanceImageProps = {
  loading: boolean;
  metadata?: NftMetadata;
  song?: string;
  performanceId?: string;
  bgColor: DolColorHex;
  donut?: DolColorHex;
  subject?: Subject;
};

export const PerformanceImage = ({
  loading,
  metadata,
  song,
  performanceId,
  bgColor,
  donut,
  subject,
}: PerformanceImageProps): React.ReactNode => {
  if (loading) {
    return (
      <div className="w-full aspect-square relative">
        <Loading sizeInPixels={90} />
      </div>
    );
  }

  return metadata ? (
    <Image
      src={ipfsToHttps(metadata.image, process.env.NEXT_PUBLIC_PINATA_GATEWAY)}
      alt={metadata.name}
      width={374}
      height={374}
      sizes="(min-width: 1024px) 680px, (min-width: 768px) 500px, (min-width: 640px) 448px, 320px"
      className="shadow-lg cursor-default rounded-2xl border border-gray-dark w-full h-auto"
      priority
    />
  ) : (
    <NFTPlaceholder
      song={song || "Loading..."}
      performanceId={performanceId || ""}
      bgColor={bgColor || DolColorHex.Dark}
      donut={donut}
      subject={subject}
    />
  );
};
