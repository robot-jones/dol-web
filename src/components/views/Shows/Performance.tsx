import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { NftId, TokenId, TransferTransaction } from "@hashgraph/sdk";
import {
  CollectionMintStatus,
  DolColorHex,
  MintStatusDisplayText,
  PerformanceAttributes,
  PreTransferResponse,
  SerialErrorResponse,
  SetlistLine,
  Subject,
  Uint8ArrayWrapper,
} from "@erikmuir/dol-lib/types";
import { boldIndicator, msToTime, toFriendlyDate } from "@erikmuir/dol-lib/utils";
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
import { Disclosure } from "@/components/common/Disclosure";
import { Loading } from "@/components/common/Loading";
import { MintActionColor, MintActionPill } from "@/components/common/MintActionPill";
import {
  AuditLogsAttribute,
  DynamicAttributes,
  FixedAttributes,
  SectionHeader,
  OtherAttributes,
} from "@/components/views/Shows/Attributes";
import { PerformanceHeading } from "@/components/views/Shows/PerformanceHeading";
import { PerformanceAudioPlayer } from "@/components/views/Shows/PerformanceAudioPlayer";
import { PerformanceImage } from "@/components/views/Shows/PerformanceImage";
import { LockedForNote } from "@/components/views/Shows/LockedForNote";
import { MintStatusText } from "@/components/views/Shows/MintStatusText";
import { InactiveMintNote } from "@/components/views/Shows/InactiveMintNote";
import { HowMintingWorksNote } from "@/components/views/Shows/HowMintingWorksNote";
import { ImageAttributesSection } from "@/components/views/Shows/ImageAttributesSection";
import { CLAIM_PROGRESS_STEPS, CLAIM_PROGRESS_STEP_INTERVAL_MS } from "@/components/views/Shows/mintProgress";
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
import { fetchStandardJson } from "@/utils";
import { openWalletConnectModal } from "@/wallet";
import { DolButton } from "@/components/common/DolButton";
import { Modal } from "@/components/globals/Modal";

// Narrower than PreTransferResponse (whose txBytes is optional) - by the
// time we ever set preparedTx, serial/txBytes are always populated together.
type PreparedTransfer = {
  serial: number;
  txBytes: Uint8ArrayWrapper;
  lockedAt?: number;
};

// How long to wait for the wallet before showing the "check another
// window" hint (Finding 51). Confirmed via live testing short enough to
// avoid flicker on a normal approval.
const WALLET_WAIT_HINT_DELAY_MS = 2000;

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
  // Gates the lock/generate/pin pipeline behind an explicit second click -
  // clicking Mint alone only opens this, nothing backend-side happens until
  // handleConfirmMint runs. Separate from the wallet's own approval prompt,
  // which still comes later in performClaim/signAndFinalize.
  const [showMintConfirm, setShowMintConfirm] = useState(false);
  const [now, setNow] = useState<number>(Date.now());
  // "Am I mid-flow" - set once claimed, cleared once signAndFinalize
  // resolves (Finding 51: fires automatically, no second click).
  const [preparedTx, setPreparedTx] = useState<PreparedTransfer | null>(null);
  // Index into CLAIM_PROGRESS_STEPS.
  const [claimProgressStep, setClaimProgressStep] = useState(0);
  const [walletWaitTimedOut, setWalletWaitTimedOut] = useState(false);
  const walletWaitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [releasingClaim, setReleasingClaim] = useState(false);
  // Set if the user releases while purchaseNft is still pending in this
  // tab - tells signAndFinalize's later continuation not to touch UI
  // state the user's already moved past.
  const releasedWhilePendingRef = useRef(false);
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
  const { accountStatus, accountStatusLoading, mutateAccountStatus } = useAccountStatus(accountId);
  const { appConfigStatus } = useAppConfigStatus();

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
  // claim just made in this tab via preparedTx), so the elapsed-time note
  // stays live without needing a network refetch - lockedAt is a fixed
  // timestamp, only "now" needs to move.
  useEffect(() => {
    if (!performance?.lockedBy && !preparedTx) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [performance?.lockedBy, preparedTx]);

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

  // Self-service release (Finding 52) - safe even if purchaseNft is still
  // pending in this tab, since releaseClaim itself verifies on-chain
  // ownership before releasing anything. releasedWhilePendingRef tells
  // signAndFinalize's later continuation not to touch UI state we're
  // about to reset here. The abort route always responds success
  // regardless of outcome, so the revalidation below is what surfaces the
  // true result either way.
  const handleReleaseClick = async () => {
    if (!preparedTx && !performance?.lockedBy) return;

    if (preparedTx) {
      releasedWhilePendingRef.current = true;
      setPreparedTx(null);
      updateStatus(MintStatusDisplayText.None);
    }

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
      mutatePerformance();
    }
  };

  const updateStatus = (newStatus: MintStatusDisplayText) => {
    setStatus(newStatus);
  };

  // Mint pill click - only opens the confirm modal. Nothing backend-side
  // (locking the performance/serial, generating the image, pinning to
  // IPFS) happens until the user explicitly confirms - see PUNCHLIST.md.
  const handleClaimClick = () => {
    if (!pageLoaded || !setlist) {
      return;
    }
    if (performance?.serial) {
      updateStatus(MintStatusDisplayText.AlreadyMinted);
      return;
    }
    setShowMintConfirm(true);
  };

  const handleCancelMintConfirm = () => setShowMintConfirm(false);

  const handleConfirmMint = () => {
    setShowMintConfirm(false);
    performClaim();
  };

  // signAndFinalize fires automatically once this resolves (Finding 51) -
  // no second click, even though this isn't technically a fresh user
  // gesture either. getMintButton's "check another window" hint is the
  // fallback for when the wallet doesn't grab focus on its own.
  const performClaim = async () => {
    updateStatus(MintStatusDisplayText.Claiming);

    // Unhandled throw here used to leave the button disabled forever
    // (Finding 31) - fetchStandardJson throws on any unmodeled error.
    let response: PreTransferResponse;
    try {
      response = await fetchStandardJson<PreTransferResponse>(
        `/api/mint/${accountId}/${date}/${position}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(attributes),
        }
      );
    } catch (err) {
      console.error("Claim request failed:", err);
      updateStatus(MintStatusDisplayText.LockNotAcquired);
      // Can't tell if a claim landed before the failure - release
      // defensively (serial in the URL is unused by the abort route when
      // there's nothing to release). Revalidate performance afterward so
      // MintStatusIndicator doesn't keep showing a stale lockedBy.
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

    const { serial, txBytes, lockedAt } = response;

    if (!txBytes) {
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

    setPreparedTx({ serial, txBytes, lockedAt });
    // Revalidate now, the earliest point the client can honestly know the
    // lock landed, rather than leaving MintStatusIndicator stale until
    // signAndFinalize finishes.
    mutatePerformance();
    await signAndFinalize({ serial, txBytes, lockedAt });
  };

  // Formerly its own click handler (handleSignClick, "Confirm in
  // Wallet") - now called automatically from handleClaimClick (Finding 51).
  const signAndFinalize = async ({ serial, txBytes }: PreparedTransfer) => {
    updateStatus(MintStatusDisplayText.InitiatingTransfer);
    setWalletWaitTimedOut(false);
    walletWaitTimeoutRef.current = setTimeout(
      () => setWalletWaitTimedOut(true),
      WALLET_WAIT_HINT_DELAY_MS
    );

    let transferSuccess = false;
    try {
      const nftId = new NftId(TokenId.fromString(hfbCollectionId), serial);
      const tx = TransferTransaction.fromBytes(new Uint8Array(txBytes.data));
      transferSuccess = await walletInterface!.purchaseNft(
        tx,
        nftId,
        date,
        parseInt(position)
      );
    } catch (err) {
      console.error("Transaction error:", err);
    } finally {
      // The wait is over either way (resolved, however it resolved) - stop
      // the hint timer and hide the hint if it had already fired.
      if (walletWaitTimeoutRef.current) {
        clearTimeout(walletWaitTimeoutRef.current);
        walletWaitTimeoutRef.current = null;
      }
      setWalletWaitTimedOut(false);
    }

    // User already released this claim while we were waiting - don't
    // overwrite UI state they've already moved past.
    if (releasedWhilePendingRef.current) {
      releasedWhilePendingRef.current = false;
      if (transferSuccess) {
        // Rare race: transfer succeeded moments after release. Not shown
        // to the user - just a best-effort finalize attempt (the
        // post-transfer route's own claim-match check decides if it's
        // safe); if it can't land, the orphaned NFT is manual-reconciliation
        // territory, same as a tab closing mid-flow.
        console.warn("Wallet transfer succeeded after the claim was already released.", { date, position, serial });
        fetchStandardJson<boolean>(
          `/api/mint/${accountId}/${date}/${position}/${serial}`,
          { method: "POST" }
        ).catch((err) => console.error("Best-effort finalize after late release failed:", err));
      }
      return;
    }

    if (!transferSuccess) {
      updateStatus(MintStatusDisplayText.TransferAborted);
      setPreparedTx(null);
      // Best-effort - UI's already reset above, so a failure here just
      // falls back to the 15-minute sweep instead of stranding anything.
      try {
        await fetchStandardJson(
          `/api/mint/${accountId}/${date}/${position}/${serial}/abort`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "WALLET_REJECTED" }),
          }
        );
      } catch (err) {
        console.error("Cleanup abort request failed:", err);
      }
      mutatePerformance();
      return;
    }

    updateStatus(MintStatusDisplayText.UpdatingMetadata);
    // Same missing-try/catch risk as the claim fetch (Finding 31), worse
    // here since the wallet's already signed and paid.
    let metadataUpdateSuccess = false;
    try {
      metadataUpdateSuccess = await fetchStandardJson<boolean>(
        `/api/mint/${accountId}/${date}/${position}/${serial}`,
        { method: "POST" }
      );
    } catch (err) {
      console.error("Metadata update request failed:", err);
    }

    setPreparedTx(null);
    // performance (SWR) doesn't update on its own just because preparedTx
    // did - without this, MintStatusIndicator stayed stuck on stale data.
    mutatePerformance();
    if (metadataUpdateSuccess) {
      // A finalized mint is also when the server consumes a whitelisted
      // account's early access (mint-gate.ts, consumeEarlyMintWhitelist) -
      // revalidate here so a still-presale second attempt in this tab sees
      // the real (no longer whitelisted) state instead of a stale cached one.
      mutateAccountStatus();
    }
    updateStatus(
      metadataUpdateSuccess
        ? MintStatusDisplayText.MintComplete
        : MintStatusDisplayText.FailedToUpdateMetadata
    );
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
    // Covers the gap between clicking Mint and preparedTx landing - the
    // old `disabled` list special-cased Claiming for the same reason (no
    // double-submit while the pre-transfer request is in flight).
    if (status === MintStatusDisplayText.Claiming) {
      return { color: "blue", label: "Claiming…" };
    }
    if (preparedTx) {
      // Gated on walletWaitTimedOut so a normal-speed approval never sees
      // it, and it naturally excludes UpdatingMetadata (that flag's
      // already reset by then) - by then the transfer's a known success,
      // nothing left to release.
      const canRelease = walletWaitTimedOut;
      return {
        color: "blue",
        label: status === MintStatusDisplayText.UpdatingMetadata
          ? "Updating Metadata…"
          : "Waiting For Your Wallet…",
        extra: (
          <div className="flex flex-col items-center gap-2">
            {canRelease && (
              <>
                <div className="text-xs text-gray-medium text-center max-w-[280px]">
                  Still waiting on your wallet - it may have opened in another window or tab. Check for it there.
                </div>
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
              </>
            )}
            <LockedForNote lockedAt={preparedTx.lockedAt} now={now} />
          </div>
        ),
      };
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
        label: "Someone's Claiming This",
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
      label: `Mint: ${hbarPrice} ℏ`,
      onClick: handleClaimClick,
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

      <Modal
        id="mint-confirm"
        show={showMintConfirm}
        onClose={handleCancelMintConfirm}
        title="Confirm Mint"
        dim
      >
        <div className="flex flex-col gap-4 w-64 text-center">
          <div className="text-balance">
            You&apos;re about to mint <strong>{attributes.song}</strong>
            {attributes.date && <> from {toFriendlyDate(attributes.date)}</>} for {hbarPrice} ℏ.
          </div>
          <div className="text-xs text-gray-medium">
            We&apos;ll lock this spot and generate your NFT, then ask you to approve payment in your wallet.
          </div>
          <div className="flex flex-col gap-3">
            <DolButton color="green" fullWidth onClick={handleConfirmMint}>Confirm</DolButton>
            <DolButton color="gray" outline fullWidth onClick={handleCancelMintConfirm}>Cancel</DolButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};
