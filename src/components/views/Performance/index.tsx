import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  extractBgColor,
  extractDonut,
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
  CollectionMintStatus,
  DolColorHex,
  MintStatusDisplayText,
  PerformanceAttributes,
  SerialErrorResponse,
  SetlistLine,
  Subject,
} from "@erikmuir/dol-lib/types";
import { boldIndicator, msToTime } from "@erikmuir/dol-lib/utils";
import { Disclosure } from "@/components/common/Disclosure";
import { DolButton } from "@/components/common/DolButton";
import { Loading } from "@/components/common/Loading";
import { MintActionColor, MintActionPill } from "@/components/common/MintActionPill";
import {
  AuditLogsAttribute,
  DynamicAttributes,
  FixedAttributes,
  SectionHeader,
  OtherAttributes,
} from "@/components/views/Performance/AttributeSections";
import { HowMintingWorksNote } from "@/components/views/Performance/HowMintingWorksNote";
import { ImageAttributesSection } from "@/components/views/Performance/ImageAttributesSection";
import { InactiveMintNote } from "@/components/views/Performance/InactiveMintNote";
import { LockedForNote } from "@/components/views/Performance/LockedForNote";
import { CLAIM_PROGRESS_STEPS, CLAIM_PROGRESS_STEP_INTERVAL_MS } from "@/components/views/Performance/mintProgress";
import { MintStatusText } from "@/components/views/Performance/MintStatusText";
import { PerformanceAudioPlayer } from "@/components/views/Performance/PerformanceAudioPlayer";
import { PerformanceHeading } from "@/components/views/Performance/PerformanceHeading";
import { PerformanceImage } from "@/components/views/Performance/PerformanceImage";
import {
  useAccountStatus,
  useAppConfigStatus,
  useIsTokenAssociated,
  useNftMetadata,
  usePerformance,
  useSetlist,
  useSetlists,
  useSong,
  useTrack,
  useWalletInterface,
} from "@/hooks";
import { MAX_CART_ITEMS } from "@/cart";
import { useCart } from "@/hooks/use-cart";
import { fetchStandardJson } from "@/utils";
import { openWalletConnectModal } from "@/wallet";
import type { ServerPrepareResponse } from "@/app/api/mint/[accountId]/[showDate]/[position]/prepare/route";

export const Performance = (): React.ReactNode => {
  const pathname = usePathname();
  const pathParts = pathname.split("/");
  const date = pathParts.at(-2) ?? "";
  const position = pathParts.at(-1) ?? "";
  const parsedPosition = parseInt(position, 10);
  const hfbCollectionId = `${process.env.NEXT_PUBLIC_HFB_COLLECTION_ID}`;
  const hbarPrice = process.env.NEXT_PUBLIC_HFB_HBAR_PRICE || "46";

  const [songId, setSongId] = useState<number>();
  const [bgColor, setBgColor] = useState<DolColorHex>(DolColorHex.Dark);
  const [donut, setDonut] = useState<DolColorHex | undefined>(DolColorHex.Red);
  const [subject, setSubject] = useState<Subject | undefined>(Subject.Lizard);
  const [attributes, setAttributes] = useState<PerformanceAttributes>({});
  const [status, setStatus] = useState<MintStatusDisplayText>(MintStatusDisplayText.None);
  const [associateError, setAssociateError] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [showImageAttributes, setShowImageAttributes] = useState(false);
  const [now, setNow] = useState<number>(Date.now());
  // Index into CLAIM_PROGRESS_STEPS - still relevant under the AC/DC Bag
  // cutover, since "Add to Bag" runs the exact same claim/render/publish
  // chain the old Mint button did (CART.md).
  const [claimProgressStep, setClaimProgressStep] = useState(0);
  const [releasingClaim, setReleasingClaim] = useState(false);
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
  const { metadata, metadataLoading } = useNftMetadata(hfbCollectionId, performance?.serial);
  const { accountId, walletInterface } = useWalletInterface();
  const { isAssociated, isAssociatedLoading, mutateIsAssociated } = useIsTokenAssociated(hfbCollectionId, accountId);
  const { accountStatus, accountStatusLoading } = useAccountStatus(accountId);
  const { appConfigStatus } = useAppConfigStatus();
  const { items: bagItems, addItem, removeItem: removeBagItem } = useCart();

  const isWhitelisted = Boolean(accountStatus?.whitelisted);
  const isBlocked = Boolean(accountStatus?.blocked);
  const collectionMintStatus = appConfigStatus?.collectionMintStatus;
  const isMinted = Boolean(performance?.serial);
  const isLocked = Boolean(performance?.lockedBy);
  const isActive = collectionMintStatus === CollectionMintStatus.OPEN;
  const isPresale = collectionMintStatus === CollectionMintStatus.PRE_SALE;
  const isPerformanceAvailable = performance && !isMinted && !isLocked;
  const isMintable = isPerformanceAvailable && !isBlocked && (isActive || (isPresale && isWhitelisted));

  // Set songId from setlist, which will in turn fetch the song
  useEffect(() => {
    if (setlist) {
      setSongId(setlist.songId);
    }
  }, [setlist]);

  // Ticks `now` while this performance is locked (by anyone, including a
  // claim just added to this account's bag), so the elapsed-time note
  // stays live without needing a network refetch - lockedAt is a fixed
  // timestamp, only "now" needs to move. Driven entirely by
  // performance?.lockedBy now (SWR) - there's no separate in-flight local
  // state to also check the way preparedTx used to, since "Add to Bag"
  // has nothing left to do once the prepare call itself resolves.
  useEffect(() => {
    if (!performance?.lockedBy) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [performance?.lockedBy]);

  // Advances CLAIM_PROGRESS_STEPS while claiming, resets otherwise.
  useEffect(() => {
    if (status !== MintStatusDisplayText.Claiming) {
      setClaimProgressStep(0);
      return;
    }
    const interval = setInterval(() => {
      setClaimProgressStep((step) =>
        Math.min(step + 1, CLAIM_PROGRESS_STEPS.length - 1)
      );
    }, CLAIM_PROGRESS_STEP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [status]);

  // Update performance attributes when sources change
  useEffect(() => {
    const newAttributes: PerformanceAttributes = {
      bgColor,
      donut,
      subject,
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
  }, [bgColor, donut, subject, track, setlist, setlists, song]);

  // Set status to Already Minted if the performance has a serial
  useEffect(() => {
    if (performance && performance.serial) {
      setStatus(MintStatusDisplayText.AlreadyMinted);
    }
  }, [performance]);

  // Set bgColor, donut, and subject from metadata
  useEffect(() => {
    if (metadata && metadata.attributes) {
      setBgColor(extractBgColor(metadata.attributes, DolColorHex.Dark));
      setDonut(extractDonut(metadata.attributes));
      setSubject(extractSubject(metadata.attributes));
    }
  }, [metadata]);

  // Reset the one-way "loaded" latches below when navigating to a
  // different performance (Finding 59) - this component doesn't remount
  // on route changes (see randomizedForRef above), so without this,
  // showImageAttributes/pageLoaded could still read `true` from whatever
  // performance was on screen before, letting PerformanceImage render a
  // stale image/attributes for an instant instead of the loading state
  // while the new performance's own data is still in flight.
  useEffect(() => {
    setShowImageAttributes(false);
    setPageLoaded(false);
  }, [date, position]);

  // Set showImageAttributes and pageLoaded based on loading states
  useEffect(() => {
    if (!showImageAttributes) {
      setShowImageAttributes(
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
    showImageAttributes,
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
    if (!isMinted) {
      randomizeAttributes();
    }
  }, [date, position, performance, performanceLoading, isMinted]);

  const handleRandomizeKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Now that ImageAttributes' randomize control has role="button"
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

  const handleConnectClick = async () => {
    openWalletConnectModal();
  };

  const handleAssociateClick = async () => {
    setAssociateError(false);
    try {
      const success = await walletInterface?.associateToken(hfbCollectionId);
      if (success) {
        mutateIsAssociated(true);
      } else {
        setAssociateError(true);
      }
    } catch {
      setAssociateError(true);
    }
  };

  // Self-service release (Finding 52) - safe regardless of any wallet
  // activity elsewhere, since releaseClaim itself verifies on-chain
  // ownership before releasing anything. Also drops the item from the
  // bag, if it's there - otherwise the bag would keep showing an entry
  // for a claim that's no longer actually locked. The abort route always
  // responds success regardless of outcome, so the revalidation below is
  // what surfaces the true result either way.
  const handleReleaseClick = async () => {
    if (!performance?.lockedBy) return;

    setReleasingClaim(true);
    try {
      await fetchStandardJson(
        `/api/mint/${accountId}/${date}/${position}/0/abort`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "USER_CANCELLED" }),
        }
      );
    } catch (err) {
      console.error("Release request failed:", err);
    } finally {
      setReleasingClaim(false);
      removeBagItem(date, parsedPosition);
      mutatePerformance();
    }
  };

  const updateStatus = (newStatus: MintStatusDisplayText) => {
    setStatus(newStatus);
  };

  // AC/DC Bag hard cutover (CART.md): the single-item Mint flow is gone -
  // this is now the only purchase-adjacent action a performance page
  // offers. Claims and publishes exactly like the old flow did, but stops
  // there - no wallet signature happens on this page any more, that's
  // Checkout's job (Bag.tsx), once per bag rather than once per item. No
  // confirmation gate here (the old "Confirm Mint" modal moved to
  // Checkout instead) - a separate explainer-modal idea is tracked in
  // CART.md but not part of this pass.
  const handleAddToBagClick = () => {
    if (!pageLoaded || !setlist) {
      return;
    }
    if (performance?.serial) {
      updateStatus(MintStatusDisplayText.AlreadyMinted);
      return;
    }
    // Refuse locally rather than claiming a real performance server-side
    // only to have nowhere local to put it - see MAX_CART_ITEMS.
    if (bagItems.length >= MAX_CART_ITEMS) {
      updateStatus(MintStatusDisplayText.TooManyLocked);
      return;
    }
    addToBag();
  };

  const addToBag = async () => {
    updateStatus(MintStatusDisplayText.Claiming);

    // Unhandled throw here used to leave the button disabled forever
    // (Finding 31) - fetchStandardJson throws on any unmodeled error.
    let response: ServerPrepareResponse;
    try {
      response = await fetchStandardJson<ServerPrepareResponse>(
        `/api/mint/${accountId}/${date}/${position}/prepare`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(attributes),
        }
      );
    } catch (err) {
      console.error("Add to Bag request failed:", err);
      updateStatus(MintStatusDisplayText.LockNotAcquired);
      // Can't tell if a claim landed before the failure - release
      // defensively (serial in the URL is unused by the abort route when
      // there's nothing to release). Revalidate performance afterward so
      // the pill doesn't keep showing a stale lockedBy.
      try {
        await fetchStandardJson(
          `/api/mint/${accountId}/${date}/${position}/0/abort`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "SYSTEM_FAILURE" }),
          }
        );
      } catch (abortErr) {
        console.error("Cleanup abort request failed:", abortErr);
      }
      mutatePerformance();
      return;
    }

    const { serial, lockedAt } = response;

    if (typeof serial !== "number" || serial <= 0) {
      // No client-side audit write here - whichever of these failed
      // already has its own server-side audit entry.
      switch (serial) {
        case SerialErrorResponse.LOCK_NOT_ACQUIRED:
          updateStatus(MintStatusDisplayText.LockNotAcquired);
          break;
        case SerialErrorResponse.ALREADY_MINTED:
          updateStatus(MintStatusDisplayText.AlreadyMinted);
          break;
        case SerialErrorResponse.NO_SUPPLY:
          updateStatus(MintStatusDisplayText.NoSupply);
          break;
        case SerialErrorResponse.TOO_MANY_LOCKED:
          updateStatus(MintStatusDisplayText.TooManyLocked);
          break;
        case SerialErrorResponse.METADATA_PUBLISH_FAILED:
          updateStatus(MintStatusDisplayText.MetadataPublishFailed);
          break;
        default:
          updateStatus(MintStatusDisplayText.LockNotAcquired);
          break;
      }
      await fetchStandardJson(
        `/api/mint/${accountId}/${date}/${position}/${serial}/abort`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "SYSTEM_FAILURE" }),
        }
      );
      mutatePerformance();
      return;
    }

    // Success - lands in the bag. performance?.lockedBy (SWR, revalidated
    // below) becomes this page's own source of truth for "already added,"
    // same as it always was for "someone else has this locked" - no
    // separate in-flight/complete local state needed the way preparedTx
    // used to provide, since there's nothing left to do on this page once
    // the prepare call itself resolves.
    addItem({ showDate: date, position: parsedPosition, serial, song: attributes.song ?? "", lockedAt });
    updateStatus(MintStatusDisplayText.None);
    mutatePerformance();
  };

  // Single source of truth for both the pill's color/label (replacing
  // MintStatusBanner) and whether it's actually clickable (replacing
  // getMintButton) - same branch order/conditions the old getMintButton
  // used, so behavior is unchanged, just no longer split across two
  // independent state machines. `extra` is secondary UI (Release button,
  // "locked for" note, associate error) that doesn't fit inside a single
  // pill and renders below it, same as before.
  type MintAction = {
    color: MintActionColor;
    label: string;
    onClick?: () => void;
    extra?: React.ReactNode;
  };

  const getMintAction = (): MintAction => {
    if (performanceLoading || isAssociatedLoading || accountStatusLoading) {
      return { color: "gray", label: "Checking availability…" };
    }
    if (!accountId) {
      return { color: "blue", label: "Connect Your Wallet", onClick: handleConnectClick };
    }
    if (!isAssociated) {
      return {
        color: "blue",
        label: "Associate The Token",
        onClick: handleAssociateClick,
        extra: associateError ? (
          <div className="text-xs text-dol-red text-center">
            Failed to associate token. Please try again.
          </div>
        ) : null,
      };
    }
    // Covers the gap between clicking Add to Bag and performance?.lockedBy
    // landing - the old `disabled` list special-cased Claiming for the
    // same reason (no double-submit while the prepare request is in
    // flight). Once this resolves, performance?.lockedBy (below) is the
    // only state this page still needs - there's no wallet-signing stage
    // left to wait through on this page any more (that moved to Checkout).
    if (status === MintStatusDisplayText.Claiming) {
      return { color: "blue", label: "Adding to Bag…" };
    }
    if (performance?.serial) {
      return { color: "red", label: `Already in Someone's Stash · #${performance.serial}` };
    }
    if (performance?.lockedBy) {
      // Only for your own lock - releasing someone else's is still
      // admin-script territory.
      const isOwnLock = performance.lockedBy === accountId;
      return {
        color: "yellow",
        label: isOwnLock ? "In Your Bag" : "Someone's Claiming This",
        extra: (
          <div className="flex flex-col items-center gap-2">
            {isOwnLock && (
              <DolButton
                size="sm"
                color="red"
                outline
                roundedFull
                onClick={handleReleaseClick}
                disabled={releasingClaim}
              >
                {releasingClaim ? "Releasing..." : "Release"}
              </DolButton>
            )}
            <LockedForNote lockedAt={performance.lockedAt} now={now} />
          </div>
        ),
      };
    }
    if (isBlocked) {
      return { color: "gray", label: "Minting Unavailable" };
    }
    if (!isMintable) {
      return { color: "gray", label: "Public Mint: 9/4" };
    }
    return {
      color: "green",
      label: `Add to Bag · ${hbarPrice} ℏ`,
      onClick: handleAddToBagClick,
    };
  };

  if (setlistLoading) {
    return <Loading sizeInPixels={90} showLyric />;
  }

  const formattedSetlist = getSetlistLines(setlists, parseInt(position))
    .map((s: SetlistLine) => (s.isCurrentPosition ? `${boldIndicator}${s.text}` : s.text))
    .join("\n");

  const positionInSet = setlist && setlists
    ? getPositionInSet(setlists, setlist.set, setlist.position)
    : undefined;

  const mintAction = getMintAction();

  const imageAttributesProps = {
    bgColor,
    donut,
    subject,
    minted: isMinted,
    handleBgColorChanged,
    handleDonutChanged,
    handleSubjectChanged,
    handleRandomizeClick,
    handleRandomizeKeyDown,
  };

  return (
    <div className="w-full max-w-[320px] sm:max-w-[448px] md:max-w-[500px] lg:max-w-[680px] mt-4 mx-auto flex flex-col">
      <div className="flex flex-col items-center gap-4 w-full">
        <InactiveMintNote
          collectionMintStatus={collectionMintStatus}
          isPerformanceAvailable={Boolean(isPerformanceAvailable)}
          isBlocked={isBlocked}
          isActive={isActive}
          isPresale={isPresale}
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
            loading={metadataLoading || !showImageAttributes}
            metadata={metadata}
            song={attributes.song}
            performanceId={attributes.performanceId}
            bgColor={bgColor}
            donut={donut}
            subject={subject}
          />
          <PerformanceAudioPlayer
            src={attributes.mp3}
            loading={trackLoading}
            className="absolute -top-4 -left-4 z-[5]"
          />
        </div>
        <MintActionPill
          color={mintAction.color}
          label={mintAction.label}
          onClick={mintAction.onClick}
        />
        {mintAction.extra}
        <MintStatusText
          performanceLoading={performanceLoading}
          status={status}
          claimProgressStep={claimProgressStep}
        />
      </div>

      <HowMintingWorksNote isMintable={Boolean(isMintable)} />

      <ImageAttributesSection show={showImageAttributes && !isMinted} {...imageAttributesProps} />

      <Disclosure summary="Details">
        <ImageAttributesSection show={showImageAttributes && isMinted} {...imageAttributesProps} />

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

      {/* The old "Confirm Mint" modal used to live here - moved to the Bag's
          Checkout button instead (CART.md, not yet built as of this pass). */}
    </div>
  );
};
