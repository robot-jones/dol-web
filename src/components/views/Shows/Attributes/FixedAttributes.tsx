import { PerformanceAttributes, Song } from "@erikmuir/dol-lib/types";
import { DataAttribute } from "../AttributeTypes/DataAttribute";

export type FixedAttributesProps = {
  attributes: PerformanceAttributes;
  trackLoading?: boolean;
  setlistLoading?: boolean;
  setlistsLoading?: boolean;
  songLoading?: boolean;
  song?: Song;
};

export const FixedAttributes = ({
  attributes,
  trackLoading,
  setlistLoading,
  setlistsLoading,
  songLoading,
}: FixedAttributesProps): React.ReactNode => {
  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-[640px] mx-auto">
      <div className="flex flex-wrap justify-center gap-2 items-center w-full">
        {/* Playback itself lives in PerformanceAudioPlayer, above the Details
            disclosure - just the link here, so there's one playable copy of
            the audio on the page, not two. */}
        <DataAttribute
          label="MP3"
          data={attributes.mp3 && "Link"}
          href={attributes.mp3}
          loading={trackLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="NFT Id"
          data={attributes.performanceId}
          loading={setlistLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="Song"
          data={attributes.song}
          loading={setlistLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="Date"
          data={attributes.date}
          href={`/shows/${attributes.date}`}
          loading={setlistLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="Set"
          data={attributes.set}
          loading={setlistLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="Position"
          data={attributes.position}
          loading={setlistLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="Preceded By"
          data={attributes.prevSong}
          loading={setlistsLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="Followed By"
          data={attributes.nextSong}
          loading={setlistsLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="Venue"
          data={attributes.venue}
          loading={setlistLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="City"
          data={attributes.city}
          loading={setlistLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="State"
          data={attributes.state}
          loading={setlistLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="Country"
          data={attributes.country}
          loading={setlistLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="Tour"
          data={attributes.tour}
          loading={setlistLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="Gap"
          data={attributes.gap}
          loading={setlistLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="Runtime"
          data={attributes.runtime}
          loading={trackLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="Alias"
          data={attributes.alias}
          loading={songLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="Original Artist"
          data={attributes.artist}
          loading={songLoading}
          attributeColor={"blue"}
        />
        <DataAttribute
          label="Debut"
          data={attributes.debut}
          href={`/shows/${attributes.debut}`}
          loading={songLoading}
          attributeColor={"blue"}
        />
      </div>
      {/* Only the MP3 field is phish.in-sourced here - everything else in
          this group is factual/structural (date, venue, song, etc). */}
      <div className="text-xs text-gray-medium italic">MP3 audio via phish.in</div>
    </div>
  );
};
