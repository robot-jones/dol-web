import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  extractBgColor,
  extractDonut,
  extractPerformanceAttributes,
  extractSubject,
  getPositionInSet,
  getSetlistLines,
  bgColors,
  donutColors,
  getRandomAttribute,
  subjects,
  getSetText,
} from "@erikmuir/dol-lib/dapp";
import {
  DolColorHex,
  PerformanceAttributes,
  SetlistLine,
  Subject,
} from "@erikmuir/dol-lib/types";
import { boldIndicator, msToTime } from "@erikmuir/dol-lib/utils";
import { Disclosure } from "@/components/common/Disclosure";
import { Loading } from "@/components/common/Loading";
import {
  AuditLogsAttribute,
  DynamicAttributes,
  FixedAttributes,
  SectionHeader,
  OtherAttributes,
} from "@/components/views/Performance/AttributeSections";
import { HowMintingWorksNote } from "@/components/views/Performance/HowMintingWorksNote";
import { CustomizableAttributesSection } from "@/components/views/Performance/CustomizableAttributesSection";
import { InactiveMintNote } from "@/components/views/Performance/InactiveMintNote";
import { MintAction } from "@/components/views/Performance/MintAction";
import { PerformanceAudioPlayer } from "@/components/views/Performance/PerformanceAudioPlayer";
import { PerformanceHeading } from "@/components/views/Performance/PerformanceHeading";
import { PerformanceImage } from "@/components/views/Performance/PerformanceImage";
import {
  useAccountStatus,
  useAppConfigStatus,
  useNftMetadata,
  usePerformance,
  useSetlist,
  useSetlists,
  useSong,
  useTrack,
  useWalletInterface,
} from "@/hooks";
import { PerformanceInscription } from "./PerformanceInscription";

export const Performance = (): React.ReactNode => {
  const pathname = usePathname();
  const pathParts = pathname.split("/");
  const date = pathParts.at(-2) ?? "";
  const position = pathParts.at(-1) ?? "";
  const parsedPosition = parseInt(position, 10);
  const hfbCollectionId = `${process.env.NEXT_PUBLIC_HFB_COLLECTION_ID}`;

  const [songId, setSongId] = useState<number>();
  const [bgColor, setBgColor] = useState<DolColorHex>(DolColorHex.Dark);
  const [donut, setDonut] = useState<DolColorHex | undefined>(DolColorHex.Red);
  const [subject, setSubject] = useState<Subject | undefined>(Subject.Lizard);
  const [inscription, setInscription] = useState<string>("");
  const [attributes, setAttributes] = useState<PerformanceAttributes>({});
  const [pageLoaded, setPageLoaded] = useState(false);
  const [showCustomizableAttributes, setShowCustomizableAttributes] = useState(false);
  // Which performance (date:position) the auto-randomize effect below has
  // already run for - keyed rather than a plain boolean since this
  // component stays mounted across in-app navigation between performances
  // (same reason PerformanceAudioPlayer resets its own state off `src`
  // rather than mount).
  const randomizedForRef = useRef<string | null>(null);

  const { setlist, setlistLoading } = useSetlist(date, position);
  const { setlists, setlistsLoading } = useSetlists(date);
  const { song, songLoading } = useSong(songId);
  const { track, trackLoading } = useTrack(date, parsedPosition);
  const { performance, performanceLoading, mutatePerformance } = usePerformance(date, parsedPosition);
  const { serial, lockedBy, lockedAt } = performance ?? {};
  const { metadata, metadataLoading } = useNftMetadata(hfbCollectionId, serial);
  const { accountId, walletInterface } = useWalletInterface();
  const { accountStatus, accountStatusLoading } = useAccountStatus(accountId);
  const { appConfigStatus, appConfigStatusLoading } = useAppConfigStatus();

  const { collectionMintStatus } = appConfigStatus ?? {};
  const isWhitelisted = Boolean(accountStatus?.whitelisted);
  const isBlocked = Boolean(accountStatus?.blocked);
  const isAvailable = Boolean(performance) && !serial && !lockedBy;

  // Set songId from setlist, which will in turn fetch the song
  useEffect(() => {
    if (setlist) {
      setSongId(setlist.songId);
    }
  }, [setlist]);

  // Update performance attributes when sources change
  useEffect(() => {
    const newAttributes: PerformanceAttributes = {
      bgColor,
      donut,
      subject,
      inscription: inscription.trim() || undefined,
    };

    if (setlist) {
      const normalizedDate = setlist.showDate.replaceAll("-", "");
      newAttributes.performanceId = `${normalizedDate}:${setlist.position}`;
      newAttributes.song = setlist.song;
      newAttributes.date = setlist.showDate;
      newAttributes.set = getSetText(setlist.set);
      newAttributes.position = setlist.position;
      newAttributes.venue = setlist.venue;
      newAttributes.city = setlist.city;
      newAttributes.state = setlist.state;
      newAttributes.country = setlist.country;
      newAttributes.tour = setlist.tourName || setlist.tourWhen;
      newAttributes.gap = setlist.gap;

      if (setlists) {
        const prev = setlists.find(
          (s) => s.set === setlist.set && s.position === setlist.position - 1
        );
        if (prev) {
          const transMark = prev.transition > 1 ? prev.transMark : "";
          newAttributes.prevSong = `${prev.song}${transMark}`;
        }

        const next = setlists.find(
          (s) => s.set === setlist.set && s.position === setlist.position + 1
        );
        if (next) {
          const transMark = setlist.transition > 1 ? setlist.transMark : "";
          newAttributes.nextSong = `${transMark}${next.song}`;
        }
      }
    }

    if (song) {
      newAttributes.alias = song.abbr;
      newAttributes.artist = song.artist;
      newAttributes.debut = song.debut;
    }

    if (track) {
      newAttributes.alias ||= track.songs[0].alias;
      newAttributes.mp3 = track.mp3Url;
      newAttributes.runtime = track.durationMs
        ? msToTime(track.durationMs)
        : undefined;
    }

    setAttributes(newAttributes);
  }, [bgColor, donut, subject, inscription, track, setlist, setlists, song]);

  // Set bgColor, donut, subject, and inscription from metadata
  useEffect(() => {
    if (metadata && metadata.attributes) {
      setBgColor(extractBgColor(metadata.attributes, DolColorHex.Dark));
      setDonut(extractDonut(metadata.attributes));
      setSubject(extractSubject(metadata.attributes));
      setInscription(extractPerformanceAttributes(metadata.attributes).inscription ?? "");
    }
  }, [metadata]);

  // Reset the one-way "loaded" latches below when navigating to a
  // different performance (Finding 59) - this component doesn't remount
  // on route changes (see randomizedForRef above), so without this,
  // showCustomizableAttributes/pageLoaded could still read `true` from whatever
  // performance was on screen before, letting PerformanceImage render a
  // stale image/attributes for an instant instead of the loading state
  // while the new performance's own data is still in flight.
  //
  // inscription reset alongside them for the same reason, but for a
  // different symptom: bgColor/donut/subject always get a fresh value on
  // navigation either way (randomizeAttributes for an unminted performance,
  // the metadata effect for a minted one), but inscription has no such
  // per-navigation source when the new performance is unminted - without
  // this, it would silently carry over from whatever performance was
  // viewed last, pre-filling the input with someone else's text right
  // before a permanent on-chain mint.
  useEffect(() => {
    setShowCustomizableAttributes(false);
    setPageLoaded(false);
    setInscription("");
  }, [date, position]);

  // Set showCustomizableAttributes and pageLoaded based on loading states
  useEffect(() => {
    if (!showCustomizableAttributes) {
      setShowCustomizableAttributes(
        !setlistLoading && !performanceLoading && !metadataLoading
      );
    }
    if (!pageLoaded) {
      setPageLoaded(
        !setlistLoading &&
          !setlistsLoading &&
          !songLoading &&
          !trackLoading &&
          !performanceLoading &&
          !metadataLoading
      );
    }
  }, [
    setlistLoading,
    setlistsLoading,
    songLoading,
    trackLoading,
    performanceLoading,
    metadataLoading,
    pageLoaded,
    showCustomizableAttributes,
  ]);

  const handleBgColorChanged = useCallback((color?: string) => {
    if (color) setBgColor(color as DolColorHex);
  }, [setBgColor]);

  // Unlike Background, Donut/Subject both have a real "None" option
  // (AttributePickerShell passes real `undefined` for it) - `if (color)`
  // silently swallowed that as "no change," so None never actually
  // cleared anything. Both are already `DolColorHex | undefined` /
  // `Subject | undefined` state, so just pass the value through.
  const handleDonutChanged = useCallback((color?: string) => {
    setDonut(color as DolColorHex | undefined);
  }, [setDonut]);

  const handleSubjectChanged = useCallback((position?: string) => {
    setSubject(position as Subject | undefined);
  }, [setSubject]);

  const handleInscriptionChanged = useCallback((value: string) => {
    setInscription(value);
  }, [setInscription]);

  const randomizeAttributes = () => {
    const randomBgColor = getRandomAttribute<DolColorHex>(bgColors);
    const randomDonut = getRandomAttribute<DolColorHex>(donutColors);
    const randomSubject = getRandomAttribute<Subject>(subjects);
    setBgColor(randomBgColor);
    setDonut(randomDonut === randomBgColor ? undefined : randomDonut);
    setSubject(randomSubject);
  };

  // Auto-randomize the customizable attributes for a still-unclaimed
  // performance, once we actually know it's unclaimed - otherwise every
  // performance nobody's bothered to customize renders identically
  // (Dark/Red/Lizard), which undersells the point of a customizable,
  // collectible NFT. Minted performances are untouched - the metadata
  // effect above already owns bgColor/donut/subject once real values
  // exist. Keyed by date:position rather than firing once per mount,
  // since this component stays mounted across in-app navigation between
  // performances (see randomizedForRef above).
  useEffect(() => {
    if (performanceLoading || !performance) return;
    const key = `${date}:${position}`;
    if (randomizedForRef.current === key) return;
    randomizedForRef.current = key;
    if (!serial) {
      randomizeAttributes();
    }
  }, [date, position, performance, performanceLoading, serial]);

  const handleRandomizeKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Now that CustomizableAttributes' randomize control has role="button"
    // (Finding 39), Space should activate it too, matching a native
    // <button>'s keyboard contract, not just Enter.
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      randomizeAttributes();
    }
  }, []);

  const handleRandomizeClick = useCallback(() => {
    randomizeAttributes();
  }, []);

  if (setlistLoading) {
    return <Loading sizeInPixels={90} showLyric />;
  }

  const formattedSetlist = getSetlistLines(setlists, parseInt(position))
    .map((s: SetlistLine) => (s.isCurrentPosition ? `${boldIndicator}${s.text}` : s.text))
    .join("\n");

  const positionInSet = setlist && setlists
    ? getPositionInSet(setlists, setlist.set, setlist.position)
    : undefined;

  const customizableAttributesProps = {
    bgColor,
    donut,
    subject,
    inscription,
    minted: Boolean(serial),
    handleBgColorChanged,
    handleDonutChanged,
    handleSubjectChanged,
    handleInscriptionChanged,
    handleRandomizeClick,
    handleRandomizeKeyDown,
  };

  return (
    <div className="w-full max-w-[320px] sm:max-w-[448px] md:max-w-[500px] lg:max-w-[680px] mt-4 mx-auto flex flex-col">
      <div className="flex flex-col items-center gap-4 w-full">
        <InactiveMintNote
          collectionMintStatus={collectionMintStatus}
          isAvailable={isAvailable}
          isBlocked={isBlocked}
          isWhitelisted={isWhitelisted}
        />
        <PerformanceHeading
          song={attributes.song}
          date={attributes.date}
          set={attributes.set}
          positionInSet={positionInSet}
        />
        <div className="relative w-full">
          <PerformanceImage
            loading={metadataLoading || !showCustomizableAttributes}
            metadata={metadata}
            song={attributes.song}
            performanceId={attributes.performanceId}
            bgColor={bgColor}
            donut={donut}
            subject={subject}
          />
          <PerformanceAudioPlayer
            src={attributes.mp3}
            showDate={attributes.date}
            loading={trackLoading}
            className="absolute top-4 left-4 right-4 z-[5]"
          />
          <PerformanceInscription isShown={Boolean(serial)} inscription={inscription} />
        </div>
        <MintAction
          showDate={date}
          position={parsedPosition}
          performanceLoading={performanceLoading}
          serial={serial}
          lockedBy={lockedBy}
          lockedAt={lockedAt}
          mutatePerformance={mutatePerformance}
          attributes={attributes}
          pageLoaded={pageLoaded}
          hasSetlist={Boolean(setlist)}
          accountId={accountId}
          walletInterface={walletInterface}
          accountStatusLoading={accountStatusLoading}
          isBlocked={isBlocked}
          isWhitelisted={isWhitelisted}
          appConfigStatusLoading={appConfigStatusLoading}
          collectionMintStatus={collectionMintStatus}
        />
      </div>

      <HowMintingWorksNote isShown={isAvailable} />

      <CustomizableAttributesSection isShown={showCustomizableAttributes && !serial} {...customizableAttributesProps} />

      <Disclosure summary="Details">
        <CustomizableAttributesSection isShown={showCustomizableAttributes && Boolean(serial)} {...customizableAttributesProps} />

        <SectionHeader text="Fixed NFT Attributes" />
        <FixedAttributes
          attributes={attributes}
          trackLoading={trackLoading}
          setlistLoading={setlistLoading}
          setlistsLoading={setlistsLoading}
          songLoading={songLoading}
          song={song}
        />

        <SectionHeader text="Dynamic Attributes" />
        <DynamicAttributes song={song} songLoading={songLoading} />

        <SectionHeader text="Other Attributes" />
        <OtherAttributes
          setlist={setlist}
          setlistLoading={setlistLoading}
          formattedSetlist={formattedSetlist}
          setlistsLoading={setlistsLoading}
          song={song}
          songLoading={songLoading}
        />

        <SectionHeader text="Audit Logs" />
        <AuditLogsAttribute setlist={setlist} setlistLoading={setlistLoading} />
      </Disclosure>
    </div>
  );
};
