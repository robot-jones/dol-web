import { Song } from "@erikmuir/dol-lib/types";
import { DataAttribute } from "../AttributeTypes/DataAttribute";

export type DynamicAttributesProps = {
  song?: Song;
  songLoading?: boolean;
};

export const DynamicAttributes = ({
  song,
  songLoading,
}: DynamicAttributesProps): React.ReactNode => {
  return (
    <div className="flex flex-wrap justify-center gap-2 items-center w-full max-w-[640px] mx-auto">
      <DataAttribute
        label="Times Played"
        data={song?.timesPlayed}
        loading={songLoading}
        attributeColor={"green"}
      />
      <DataAttribute
        label="Last Played"
        data={song?.lastPlayed}
        href={`/shows/${song?.lastPlayed}`}
        loading={songLoading}
        attributeColor={"green"}
      />
      <DataAttribute
        label="Current Gap"
        data={song?.gap || "0"}
        loading={songLoading}
        attributeColor={"green"}
      />
    </div>
  );
};
