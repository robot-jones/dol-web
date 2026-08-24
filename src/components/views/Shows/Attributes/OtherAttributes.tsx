import { Setlist, Song } from "@erikmuir/dol-lib/types";
import { TextAttribute } from "../AttributeTypes/TextAttribute";

export type OtherAttributesProps = {
  setlist?: Setlist;
  setlistLoading?: boolean;
  formattedSetlist?: string;
  setlistsLoading?: boolean;
  song?: Song;
  songLoading?: boolean;
};

export const OtherAttributes = ({
  setlist,
  setlistLoading,
  formattedSetlist,
  setlistsLoading,
  song,
  songLoading,
}: OtherAttributesProps): React.ReactNode => {
  return (
    <div className="flex flex-wrap justify-center gap-2 items-center w-full max-w-[640px] mx-auto">
      <TextAttribute
        label="Footnote"
        text={setlist?.footnote}
        loading={setlistLoading}
        fullWidth
        textCentered
      />
      <TextAttribute
        label="Jamchart"
        text={setlist?.jamChartDescription}
        loading={setlistLoading}
        fullWidth
        textCentered
      />
      <TextAttribute
        label="Setlist"
        text={formattedSetlist}
        loading={setlistsLoading}
        fullWidth
        textCentered
      />
      <TextAttribute
        label="Lyrics"
        text={song?.lyrics}
        loading={songLoading}
        fullWidth
        textCentered
      />
    </div>
  );
};
