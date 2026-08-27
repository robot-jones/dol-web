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
  PerformanceAttributes,
  SetlistLine,
  Subject,
} from "@erikmuir/dol-lib/types";
import { boldIndicator, msToTime } from "@erikmuir/dol-lib/utils";
import { Disclosure } from "@/components/common/Disclosure";
import { DolButton } from "@/components/common/DolButton";
import { Loading } from "@/components/common/Loading";
import { MintActionColor, MintActionPill } from "@/components/common/MintActionPill";
import { Modal } from "@/components/globals/Modal";
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
import { addToBag, MAX_CART_ITEMS } from "@/cart";
import { useCart } from "@/hooks/use-cart";
import { fetchStandardJson } from "@/utils";
import { openWalletConnectModal } from "@/wallet";

// AC/DC Bag intro modal (CART.md): shown once ever per browser, not once
// per empty bag - localStorage rather than sessionStorage, since the
// explanation itself never goes stale the way cart items can (that's
// specifically why cart state uses sessionStorage instead).
const BAG_INTRO_SEEN_KEY = "dol-bag-intro-seen";

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
  const [associateError, setAssociateError] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [showBagIntro, setShowBagIntro] = useState(false);
  const [showImageAttributes, setShowImageAttributes] = useState(false);
  const [now, setNow] = useState<number>(Date.now());
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
  const cart = useCart();
  const { items: bagItems, removeItem: removeBagItem } = cart;
  const bagEntry = bagItems.find((i) => i.showDate === date && i.position === parsedPosition);

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

  // Ticks `now` while this performance is locked (by anyone) or in this
  // account's own bag, so the elapsed-time note stays live without
  // needing a network refetch - lockedAt is a fixed timestamp, only "now"
  // needs to move.
  //
  // Bug fixed 2026-08-27: this used to gate on performance?.lockedBy
  // (SWR) alone, but getMintAction's bagEntry branch (instant cart state)
  // can start rendering LockedForNote before SWR ever refetches - nothing
  // in the instant-add flow calls mutatePerformance any more, so
  // performance?.lockedBy could stay stale indefinitely. That left `now`
  // stuck at whatever it was when the component mounted while
  // bagEntry.lockedAt was a fresh server timestamp, so `now - lockedAt`
  // came out negative ("Locked for -1:-16") until SWR happened to
  // revalidate on its own - which might be a while, or never, while the
  // tab stays open. Gating on bagEntry too, and setting `now` immediately
  // when the effect (re)starts rather than waiting for the first 1s tick,
  // closes both the "SWR never caught up" gap and the general "now was
  // already stale before this effect even started" gap.
  const isInBag = Boolean(bagEntry);
  useEffect(() => {
    if (!performance?.lockedBy && !isInBag) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [performance?.lockedBy, isInBag]);

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

  // AC/DC Bag hard cutover (CART.md), instant-add revision: the single-item
  // Mint flow is gone - this is now the only purchase-adjacent action a
  // performance page offers, and it no longer waits on anything. A pending
  // entry lands in the bag synchronously (see addToBag in @/cart), so the
  // pill flips to "In Your Bag" immediately - no spinner or progress text
  // on this page any more, that all moved into the Bag view, which can
  // track multiple in-flight adds independently and survives navigation
  // (this component doesn't remount between performances, so the old
  // per-page status/progress state could otherwise bleed a stale "still
  // claiming" onto whatever page you navigated to next). The old "Confirm
  // Mint" modal moved to Checkout - what gates this click now is the
  // one-time bag-intro modal below, not a per-click confirmation.
  const handleAddToBagClick = () => {
    if (!pageLoaded || !setlist || !accountId) {
      return;
    }
    // Both of these are guarded here too, but shouldn't normally be
    // reachable - getMintAction below only wires this handler up once
    // neither condition holds, so hitting either here would mean stale
    // SWR/cart data at click time (rare race, not the common path).
    if (performance?.serial) {
      return;
    }
    if (bagItems.length >= MAX_CART_ITEMS) {
      return;
    }
    // Only gated the very first time ever, per browser - not re-checked
    // against current bag contents, so it can't get re-triggered just
    // because someone emptied their bag out via a completed checkout.
    let seenIntro = true;
    try {
      seenIntro = Boolean(localStorage.getItem(BAG_INTRO_SEEN_KEY));
    } catch (err) {
      console.error("Failed to read bag-intro-seen flag:", err);
    }
    if (seenIntro) {
      addToBag(cart, accountId, date, parsedPosition, attributes);
    } else {
      setShowBagIntro(true);
    }
  };

  const handleBagIntroCancel = () => setShowBagIntro(false);

  const handleBagIntroOk = () => {
    setShowBagIntro(false);
    try {
      localStorage.setItem(BAG_INTRO_SEEN_KEY, "true");
    } catch (err) {
      console.error("Failed to persist bag-intro-seen flag:", err);
    }
    if (accountId) {
      addToBag(cart, accountId, date, parsedPosition, attributes);
    }
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
      return { color: "blue", label: `Connect Your Wallet · ${hbarPrice} ℏ`, onClick: handleConnectClick };
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
    if (performance?.serial) {
      return { color: "red", label: `Already in Someone's Stash · #${performance.serial}` };
    }
    // Instant feedback (CART.md): checked against local cart state, not
    // performance?.lockedBy (SWR) - addToBag adds a pending entry
    // synchronously, before any network call, so this flips the moment the
    // click happens rather than once the server confirms it. No spinner or
    // progress text here either way, pending or ready - that's the Bag
    // view's job now. Release only offered once ready - cancelling a
    // still-in-flight add isn't supported yet (CART.md).
    if (bagEntry) {
      return {
        color: "yellow",
        label: "In Your Bag",
        extra: bagEntry.status === "ready" ? (
          <div className="flex flex-col items-center gap-2">
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
            <LockedForNote lockedAt={bagEntry.lockedAt} now={now} />
          </div>
        ) : null,
      };
    }
    if (performance?.lockedBy) {
      // Locked server-side but not tracked in this account's bag - either
      // someone else's claim, or this account's own pending add got
      // dropped (e.g. a reload while it was still in flight - cart state
      // doesn't try to resurrect those, CART.md). Own-lock still gets a
      // Release button here so a dropped-but-real claim isn't stuck -
      // just not re-addable to the bag without releasing first.
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
    if (bagItems.length >= MAX_CART_ITEMS) {
      return { color: "gray", label: `Your Bag is Full (${MAX_CART_ITEMS} max)` };
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

      <Modal
        id="bag-intro"
        show={showBagIntro}
        onClose={handleBagIntroCancel}
        title="Your AC/DC Bag"
        dim
      >
        <div className="flex flex-col gap-4 w-64 text-center">
          <div className="text-balance">
            Add up to 10 performances to your bag, then check out once to mint them all together.
          </div>
          <div className="text-xs text-gray-medium">
            Adding something to your bag locks it and starts generating your NFT right away, so it&apos;s reserved for you. If you don&apos;t check out, it auto-releases within ~15m.
          </div>
          <div className="flex flex-col gap-3">
            <DolButton color="green" fullWidth onClick={handleBagIntroOk}>OK</DolButton>
            <DolButton color="gray" outline fullWidth onClick={handleBagIntroCancel}>Cancel</DolButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};
